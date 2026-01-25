/**
 * Bundles user code with npm dependencies using esbuild
 */

import { build } from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { detectPackages } from './packageDetector.js';

export async function bundleCode(code, fileName) {
    const packages = detectPackages(code);

    // If no external packages, return original code
    if (packages.length === 0) {
        return { bundled: false, code, packages: [] };
    }

    console.log(`[Bundler] Detected packages:`, packages);

    // Create temporary workspace
    const tempDir = path.join(os.tmpdir(), `teachgrid_bundle_${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const codeFilePath = path.join(tempDir, fileName);
    const bundleFilePath = path.join(tempDir, 'bundle.js');

    try {
        // Write user code to temp file
        await fs.writeFile(codeFilePath, code);

        // Create package.json
        const packageJson = {
            name: 'teachgrid-user-code',
            version: '1.0.0',
            type: 'commonjs'
        };
        await fs.writeFile(
            path.join(tempDir, 'package.json'),
            JSON.stringify(packageJson, null, 2)
        );

        // Install packages
        console.log(`[Bundler] Installing packages in ${tempDir}...`);
        await installPackages(tempDir, packages);

        // Bundle with esbuild
        console.log(`[Bundler] Bundling code...`);
        await build({
            entryPoints: [codeFilePath],
            bundle: true,
            platform: 'node',
            target: 'node18',
            outfile: bundleFilePath,
            format: 'cjs',
            external: [], // Bundle everything
            logLevel: 'warning'
        });

        // Read bundled code
        const bundledCode = await fs.readFile(bundleFilePath, 'utf-8');

        console.log(`[Bundler] Bundle created successfully (${bundledCode.length} bytes)`);

        return {
            bundled: true,
            code: bundledCode,
            packages,
            tempDir // Keep for cleanup
        };

    } catch (error) {
        console.error('[Bundler] Error:', error);
        // Cleanup on error
        await fs.rm(tempDir, { recursive: true, force: true });
        throw new Error(`Bundling failed: ${error.message}`);
    }
}

function installPackages(cwd, packages) {
    return new Promise((resolve, reject) => {
        const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
        const args = ['install', '--no-save', '--legacy-peer-deps', ...packages];

        const proc = spawn(npm, args, { cwd, shell: true });

        let output = '';
        proc.stdout.on('data', (data) => {
            output += data.toString();
        });

        proc.stderr.on('data', (data) => {
            output += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`[Bundler] Packages installed successfully`);
                resolve();
            } else {
                reject(new Error(`npm install failed with code ${code}: ${output}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to run npm: ${err.message}`));
        });
    });
}

export async function cleanupBundle(tempDir) {
    if (tempDir) {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
            console.log(`[Bundler] Cleaned up ${tempDir}`);
        } catch (err) {
            console.error(`[Bundler] Cleanup error:`, err);
        }
    }
}
