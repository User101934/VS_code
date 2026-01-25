import { executeLocalCode } from './localExecutor.js';
import { executePistonCode } from './pistonExecutor.js';
import { LANGUAGES } from '../config/languages.js';

export async function executeCode(socket, payload, sessionData) {
    const { language } = payload;
    const mode = process.env.EXECUTION_MODE || 'local';

    console.log(`[Executor] Language: ${language}, Mode: ${mode}`);

    if (language === 'terminal') {
        console.log('[Executor] Terminal command detected, routing to localExecutor');
        // Terminal commands always run locally
        return executeLocalCode(socket, payload);
    }

    if (!LANGUAGES[language]) {
        socket.emit('output', `\n❌ Error: Unsupported language: ${language}\n`);
        socket.emit('execution_complete');
        return;
    }

    if (mode === 'local') {
        return executeLocalCode(socket, payload);
    }

    if (mode === 'piston') {
        return executePistonCode(socket, payload);
    }

    socket.emit('output', `\n❌ Error: Unknown execution mode: ${mode}\n`);
    socket.emit('execution_complete');
}
