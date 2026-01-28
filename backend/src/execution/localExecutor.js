import { spawn } from 'child_process';
import { LANGUAGES } from '../config/languages.js';
import { sanitizeInput } from '../utils/helpers.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { bundleCode, cleanupBundle } from '../utils/bundler.js';

// ... (imports remain)
import { ensurePythonPackages } from '../utils/pythonPkgManager.js';
import { ensureJavaPackages } from '../utils/javaPkgManager.js';
import { detectPackages } from '../utils/packageDetector.js';

export async function executeLocalCode(socket, payload) {
    const { language, code, fileName, command, args, _retryWithPy } = payload;

    if (language === 'terminal') {
        const cmdToRun = command;
        const argsToRun = args || [];

        socket.emit('output', `➜ Running: ${cmdToRun} ${argsToRun.join(' ')}\n`);

        const childProcess = spawn(cmdToRun, argsToRun, {
            cwd: path.join(os.tmpdir(), 'teachgrid-workspace'),
            shell: true
        });

        childProcess.stdout.on('data', (data) => {
            socket.emit('output', data.toString());
        });

        childProcess.stderr.on('data', (data) => {
            socket.emit('output', data.toString());
        });

        childProcess.on('close', (code) => {
            socket.emit('output', `\nProcess exited with code ${code}\n`);
            socket.emit('execution_complete');
        });

        childProcess.on('error', (err) => {
            socket.emit('output', `\n❌ Error: ${err.message}\n`);
            socket.emit('execution_complete');
        });

        return;
    }

    const langConfig = LANGUAGES[language];
    if (!langConfig) {
        throw new Error(`Unsupported language: ${language}`);
    }

    let rawCommandList = langConfig.localCommand || langConfig.command;

    if (_retryWithPy && language === 'python') {
        rawCommandList = ['py', '-u', langConfig.file];
    }

    if (!rawCommandList || rawCommandList.length === 0) {
        throw new Error(`No local execution command defined for ${language}`);
    }

    const sanitizedCode = sanitizeInput(code);

    let codeToExecute = sanitizedCode;
    let bundleTempDir = null;
    let extraEnv = {}; // Environment variables to inject

    // Handle JavaScript Bundling
    if (language === 'javascript' && sanitizedCode.includes('require(')) {
        try {
            socket.emit('output', `🔍 Detecting npm packages...\n`);
            // Note: packageDetector now requires 2 args, but bundleCode might handle it internally or we check bundler.js
            // bundler.js calls detectPackages(code), so we might need to update bundler.js later if we changed detectPackages signature
            // Checking: I changed detectPackages to (code, language='javascript'). bundler.js calls it with (code).
            // So default 'javascript' works fine there.
            const bundleResult = await bundleCode(sanitizedCode, fileName);

            if (bundleResult.bundled) {
                socket.emit('output', `📦 Installing packages: ${bundleResult.packages.join(', ')}\n`);
                socket.emit('output', `⚡ Bundling code...\n`);
                codeToExecute = bundleResult.code;
                bundleTempDir = bundleResult.tempDir;
            }
        } catch (bundleError) {
            socket.emit('output', `⚠️  Bundling failed: ${bundleError.message}\n`);
            socket.emit('output', `▶ Attempting to run without bundling...\n`);
        }
    }

    // Handle Python Package Installation
    if (language === 'python') {
        try {
            const detectedPackages = detectPackages(sanitizedCode, 'python');

            if (detectedPackages.length > 0) {
                // Optimize user experience: Don't spam messages if packages are already there.
                // We check first.
                console.time("python-package-check");
                const { libPath, newlyInstalled } = await ensurePythonPackages(detectedPackages);
                console.timeEnd("python-package-check");

                if (newlyInstalled) {
                    socket.emit('output', `🔍 Detected new Python packages: ${detectedPackages.join(', ')}\n`);
                    socket.emit('output', `📦 Installing packages (this may take a moment)...\n`);
                    socket.emit('output', `✅ Packages installed.\n`);
                } else {
                    // specific verbose mode or just quiet?
                    // Quiet is faster.
                    // console.log("Packages already installed, skipping UI updates.");
                }

                // Add to PYTHONPATH
                const currentPythonPath = process.env.PYTHONPATH || '';
                extraEnv['PYTHONPATH'] = currentPythonPath
                    ? `${libPath}${path.delimiter}${currentPythonPath}`
                    : libPath;
            }
        } catch (err) {
            socket.emit('output', `⚠️  Package installation warning: ${err.message}\n`);
            socket.emit('output', `▶ Proceeding with execution...\n`);
        }
    }

    // Handle Java Package Installation
    if (language === 'java') {
        try {
            const detectedPackages = detectPackages(sanitizedCode, 'java');

            if (detectedPackages.length > 0) {
                socket.emit('output', `🔍 Detected Java imports: ${detectedPackages.join(', ')}\n`);
                socket.emit('output', `📦 Resolving Maven dependencies (this may take a moment)...\n`);

                const classpath = await ensureJavaPackages(detectedPackages);

                // Add to CLASSPATH environment variable
                // Important: Include '.' (current dir) so regular compilation works
                const separator = process.platform === 'win32' ? ';' : ':';
                const currentClassPath = process.env.CLASSPATH || '';

                // We construct a new CLASSPATH including our libs and the current directory (.)
                extraEnv['CLASSPATH'] = `.${separator}${classpath}${currentClassPath ? separator + currentClassPath : ''}`;

                socket.emit('output', `✅ Dependencies added to Classpath. Executing...\n`);
            }
        } catch (err) {
            socket.emit('output', `⚠️  Dependency resolution warning: ${err.message}\n`);
            socket.emit('output', `▶ Proceeding with execution...\n`);
        }
    }

    const tempDir = path.join(os.tmpdir(), `teachgrid_${socket.id}_${Date.now()}`);

    await fs.mkdir(tempDir, { recursive: true });
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, codeToExecute);

    if (!_retryWithPy) {
        socket.emit('output', `▶ Executing locally: ${fileName}...\n`);
        console.log(`[Local Execution] Running ${language} file: ${fileName}`);
    }

    const defaultFileName = langConfig.file;
    const defaultBaseName = path.parse(defaultFileName).name;
    const actualBaseName = path.parse(fileName).name;

    const commandList = rawCommandList.map(part => {
        let newPart = part;
        if (defaultFileName) {
            newPart = newPart.replaceAll(defaultFileName, fileName);
        }
        if (defaultBaseName && defaultBaseName !== actualBaseName) {
            newPart = newPart.replaceAll(defaultBaseName, actualBaseName);
        }
        return newPart;
    });

    let cmd = commandList[0];
    let executionArgs = commandList.slice(1);

    const childProcess = spawn(cmd, executionArgs, {
        cwd: tempDir,
        shell: true,
        timeout: langConfig.timeout || 10000,
        env: { ...process.env, ...extraEnv } // Inject extra environment variables
    });

    childProcess.on('error', (err) => {
        if (err.code === 'ENOENT' && cmd === 'python' && !_retryWithPy) {
            console.log('[Local Execution] python not found, trying py...');
            executeLocalCode(socket, { ...payload, _retryWithPy: true });
            return;
        }
        socket.emit('output', `Execution failed: ${err.message}\n`);
        socket.emit('execution_complete');
    });

    childProcess.stdout.on('data', (data) => {
        socket.emit('output', data.toString());
    });

    childProcess.stderr.on('data', (data) => {
        socket.emit('output', `Error: ${data.toString()}`);
    });

    childProcess.on('close', async (code) => {
        socket.emit('output', `\nProcess exited with code ${code}\n`);
        socket.emit('execution_complete');

        try {
            await fs.rm(tempDir, { recursive: true, force: true });
            // Cleanup bundle temp directory if it exists
            if (bundleTempDir) {
                await cleanupBundle(bundleTempDir);
            }
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    });
}
