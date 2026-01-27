
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

class TerminalManager {
    constructor() {
        this.sessions = {}; // socketId -> { cwd: string, process: ChildProcess | null }
    }

    // Initialize a session with default CWD
    // Initialize a session with default CWD
    createSession(socketId, socket) {
        if (!this.sessions[socketId]) {
            // Default to Project Root (D:\teachgrid_vs) to match virtual file tree
            const root = path.resolve(process.cwd(), '..');
            this.sessions[socketId] = {
                cwd: root,
                projectRoot: root,
                process: null
            };
            if (socket) {
                socket.emit('terminal:cwd', '');
            }
        }
        return this.sessions[socketId];
    }

    // Dispatch input: either as a new command or stdin for running process
    handleInput(socketId, data, socket) {
        const session = this.createSession(socketId, socket);
        if (session.process) {
            this.write(socketId, data);
        } else {
            this.execute(socketId, data, socket);
        }
    }

    // Execute a command (spawn a process or handle internal commands like cd)
    // Execute a command (spawn a process or handle internal commands like cd)
    execute(socketId, command, socket) {
        const session = this.createSession(socketId, socket);
        let trimmedCmd = command.trim();

        if (!trimmedCmd) return;

        // --- Aliases for Windows CMD ---
        const aliases = {
            'ls': 'dir /b',
            'dir': 'dir /b',
            'll': 'dir',
            'cat': 'type',
            'rm': 'del',
            'clear': 'cls'
        };
        const parts = trimmedCmd.split(' ');
        if (aliases[parts[0]]) {
            parts[0] = aliases[parts[0]];
            trimmedCmd = parts.join(' ');
        }

        // --- Handle 'cd' internally ---
        if (trimmedCmd.startsWith('cd ') || trimmedCmd === 'cd') {
            const args = trimmedCmd.split(' ').slice(1);
            let targetDir = args[0] || os.homedir();

            // Handle quotes if any (basic)
            if (targetDir.startsWith('"') && targetDir.endsWith('"')) {
                targetDir = targetDir.slice(1, -1);
            }

            // Resolve path relative to current cwd
            const newPath = path.resolve(session.cwd, targetDir);

            // SANDBOX CHECK
            if (!newPath.startsWith(session.projectRoot)) {
                socket.emit('terminal:output', `Error: Access denied (Sandbox Restriction). Cannot navigate outside project root.\r\n`);
                return;
            }

            fs.access(newPath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
                if (err) {
                    socket.emit('terminal:output', `cd: no such file or directory: ${targetDir}\r\n`);
                } else {
                    // Update session CWD
                    session.cwd = newPath;

                    // Emit RELATIVE path for UI (hides D:\...)
                    // If outside project, it will show ../.. which is fine/honest without full path
                    const relPath = path.relative(session.projectRoot, newPath);
                    socket.emit('terminal:cwd', relPath);
                }
            });
            return; // 'cd' is handled, don't spawn
        }

        // --- Handle 'cls' / 'clear' ---
        if (trimmedCmd === 'cls' || trimmedCmd === 'clear') {
            socket.emit('terminal:output', '\x1b[2J\x1b[0f'); // ANSI clear
            return;
        }

        // --- Spawn System Command ---
        try {
            const proc = spawn(trimmedCmd, [], {
                cwd: session.cwd,
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            session.process = proc; // Track active process for kill/stdin

            proc.stdout.on('data', (data) => {
                socket.emit('terminal:output', data.toString());
            });

            proc.stderr.on('data', (data) => {
                socket.emit('terminal:output', data.toString());
            });

            proc.on('close', (code) => {
                session.process = null;
            });

            proc.on('error', (err) => {
                socket.emit('terminal:output', `Error spawning command: ${err.message}\r\n`);
                session.process = null;
            });

        } catch (e) {
            socket.emit('terminal:output', `Failed to execute: ${e.message}\r\n`);
        }
    }

    // Write to stdin of the currently running process (for interactive checks like "Are you sure? y/n")
    write(socketId, data) {
        const session = this.sessions[socketId];
        if (session && session.process && session.process.stdin) {
            try {
                session.process.stdin.write(data);
            } catch (err) {
                // Ignore write errors to closed pipes
            }
        }
    }

    resize(socketId, cols, rows) {
        // Not applicable for spawn, but kept for API compatibility
    }

    kill(socketId) {
        const session = this.sessions[socketId];
        if (session) {
            if (session.process) {
                session.process.kill();
            }
            delete this.sessions[socketId];
        }
    }
}

export default new TerminalManager();
