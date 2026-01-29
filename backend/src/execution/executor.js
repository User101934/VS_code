import { executeLocalCode } from './localExecutor.js';
import { executePistonCode } from './pistonExecutor.js';
import { LANGUAGES } from '../config/languages.js';

export async function executeCode(socket, payload, sessionData) {
    const { language, executionMode } = payload;
    let mode = executionMode || process.env.EXECUTION_MODE || 'auto';

    console.log(`[Executor] 🔍 Received executionMode from frontend: "${executionMode}"`);
    console.log(`[Executor] 🔍 Initial mode value: "${mode}"`);

    // Smart Routing Logic: 
    // "Heavy" languages (with local dependency management) default to Local.
    // Others default to Piston for broad support.
    if (mode === 'auto') {
        if (['python', 'javascript', 'java'].includes(language)) {
            mode = 'local';
        } else {
            mode = 'piston';
        }
        console.log(`[Executor] ⚙️  Auto-routing ${language} → ${mode}`);
    }

    console.log(`[Executor] ✅ Final execution mode: ${mode.toUpperCase()}`);

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
