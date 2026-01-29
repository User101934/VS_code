import pty from 'node-pty';
import { LANGUAGES } from '../config/languages.js';
import { sanitizeInput } from '../utils/helpers.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { bundleCode, cleanupBundle } from '../utils/bundler.js';
import { ensurePythonPackages } from '../utils/pythonPkgManager.js';
import { ensureJavaPackages } from '../utils/javaPkgManager.js';
import { detectPackages } from '../utils/packageDetector.js';

export async function executeLocalCode(socket, payload) {
    const { language, code, fileName } = payload;

    const langConfig = LANGUAGES[language];
    if (!langConfig) {
        socket.emit('output', `❌ Unsupported language: ${language}\n`);
        socket.emit('execution_complete');
        return;
    }

    const sanitizedCode = sanitizeInput(code);
    let codeToExecute = sanitizedCode;
    let bundleTempDir = null;

    // ---------------- JS BUNDLING ----------------
    if (language === 'javascript' && sanitizedCode.includes('require(')) {
        try {
            const bundleResult = await bundleCode(sanitizedCode, fileName);
            if (bundleResult.bundled) {
                codeToExecute = bundleResult.code;
                bundleTempDir = bundleResult.tempDir;
            }
        } catch (err) {
            socket.emit('output', `⚠️ Bundling failed: ${err.message}\n`);
        }
    }

    // ---------------- PYTHON PACKAGES ----------------
    if (language === 'python') {
        try {
            const pkgs = detectPackages(sanitizedCode, 'python');
            await ensurePythonPackages(pkgs);
        } catch (err) {
            socket.emit('output', `⚠️ Package install warning: ${err.message}\n`);
        }
    }

    // ---------------- JAVA PACKAGES ----------------
    if (language === 'java') {
        try {
            const pkgs = detectPackages(sanitizedCode, 'java');
            await ensureJavaPackages(pkgs);
        } catch (err) {
            socket.emit('output', `⚠️ Dependency warning: ${err.message}\n`);
        }
    }

    // ---------------- TEMP WORKSPACE ----------------
    const tempDir = path.join(os.tmpdir(), `teachgrid_${socket.id}_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, codeToExecute);

    socket.emit('output', `▶ Executing ${fileName} (interactive mode)...\n`);

    // ---------------- PTY EXECUTION ----------------

    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';

    const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        cwd: tempDir,
        env: process.env
    });

    const defaultFileName = langConfig.file;
    const defaultBaseName = path.parse(defaultFileName).name;
    const actualBaseName = path.parse(fileName).name;

    const commandList = (langConfig.localCommand || langConfig.command).map(part => {
        let newPart = part;
        if (defaultFileName) newPart = newPart.replaceAll(defaultFileName, fileName);
        if (defaultBaseName !== actualBaseName) {
            newPart = newPart.replaceAll(defaultBaseName, actualBaseName);
        }
        return newPart;
    });

    const finalCommand = commandList.join(' ');

    // Stream output
    ptyProcess.onData(data => {
        socket.emit('output', data);
    });

    ptyProcess.onExit(async () => {
        socket.emit('execution_complete');
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
            if (bundleTempDir) await cleanupBundle(bundleTempDir);
        } catch (e) {
            console.error('Cleanup error:', e);
        }
    });

    // Run program inside PTY
    ptyProcess.write(finalCommand + '\r');

    // Attach PTY to socket so frontend can send user input
    socket._ptyProcess = ptyProcess;
}
