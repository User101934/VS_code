/**
 * Manages Python package installations for user code execution.
 * Installs packages to a persistent 'user_libs' directory.
 */

import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';

// Persistent directory for user python libraries
// In production, this should probably be configurable or outside the source tree
const USER_LIB_DIR = path.join(process.cwd(), 'user_libs', 'python');
const MANIFEST_FILE = path.join(USER_LIB_DIR, 'installed_packages.json');

export async function ensurePythonPackages(packages) {
    if (!packages || packages.length === 0) {
        return { libPath: USER_LIB_DIR, newlyInstalled: false };
    }

    // Ensure lib directory exists
    await fs.mkdir(USER_LIB_DIR, { recursive: true });

    // Filter out packages that definitely shouldn't be installed via pip
    const validPackages = packages.filter(p => !p.startsWith('_'));

    if (validPackages.length === 0) {
        return { libPath: USER_LIB_DIR, newlyInstalled: false };
    }

    // --- MANIFEST CHECK ---
    let installedPackages = [];
    try {
        const manifestContent = await fs.readFile(MANIFEST_FILE, 'utf-8');
        installedPackages = JSON.parse(manifestContent);
    } catch (err) {
        // Manifest doesn't exist or is invalid, assume empty
        installedPackages = [];
    }

    // Find packages that are NOT in the manifest
    const newPackages = validPackages.filter(p => !installedPackages.includes(p));

    if (newPackages.length === 0) {
        // All good, skip installation
        return { libPath: USER_LIB_DIR, newlyInstalled: false };
    }

    console.log(`[PythonPkgManager] Installing new packages: ${newPackages.join(', ')}`);

    try {
        // Install ONLY the new packages
        await installPackagesRefined(newPackages);

        // Update Manifest
        const updatedList = [...new Set([...installedPackages, ...newPackages])];
        await fs.writeFile(MANIFEST_FILE, JSON.stringify(updatedList, null, 2));

        return { libPath: USER_LIB_DIR, newlyInstalled: true };
    } catch (error) {
        console.error(`[PythonPkgManager] Installation failed: ${error.message}`);
        throw error; // Let executor handle the error
    }
}

function installPackagesRefined(packages) {
    return new Promise((resolve, reject) => {
        // Construct pip command
        // pip install --target <USER_LIB_DIR> package1 package2 ...
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

        // Use --target to install to our custom directory
        // Use --upgrade to ensure we satisfy requirements (optional, maybe remove for speed)
        // Use --no-user to avoid user-scheme warnings
        const args = [
            '-m', 'pip', 'install',
            '--target', USER_LIB_DIR,
            ...packages
        ];

        console.log(`[PythonPkgManager] Running: ${pythonCmd} ${args.join(' ')}`);

        const proc = spawn(pythonCmd, args, {
            stdio: ['ignore', 'pipe', 'pipe'], // Capture output
            shell: true
        });

        let output = '';
        let errorOutput = '';

        proc.stdout.on('data', (data) => {
            output += data.toString();
        });

        proc.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        proc.on('close', (code) => {
            if (code === 0) {
                console.log(`[PythonPkgManager] Installed successfully.`);
                resolve(output);
            } else {
                // Pip often writes to stderr even for warnings, so check code strictly
                console.error(`[PythonPkgManager] pip failed with code ${code}`);
                console.error(`stderr: ${errorOutput}`);
                reject(new Error(`pip install failed: ${errorOutput || output}`));
            }
        });

        proc.on('error', (err) => {
            reject(new Error(`Failed to spawn pip: ${err.message}`));
        });
    });
}
