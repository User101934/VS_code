import { executeLocalCode } from './localExecutor.js';
import { executePistonCode } from './pistonExecutor.js';
import { LANGUAGES } from '../config/languages.js';

export async function executeCode(socket, payload, sessionData) {
    const { language, executionMode } = payload;
    let mode = executionMode || process.env.EXECUTION_MODE || 'auto';

    // Smart Routing Logic: 
    // "Heavy" languages (with local dependency management) default to Local.
    // Others default to Piston for broad support.
    if (mode === 'auto') {
        if (['python', 'javascript', 'java'].includes(language)) {
            mode = 'local';
        } else {
            mode = 'piston';
        }
    }

    console.log(`[Executor] Language: ${language}, Selected Mode: ${mode}`);

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
