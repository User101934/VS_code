import { LANGUAGES } from '../config/languages.js';

const PISTON_LANG_MAP = {
    'python': { language: 'python', version: '3.10.0' },
    'javascript': { language: 'js', version: '18.15.0' },
    'typescript': { language: 'ts', version: '4.9.5' },
    'java': { language: 'java', version: '15.0.2' },
    'c': { language: 'c', version: '10.2.0' },
    'cpp': { language: 'cpp', version: '10.2.0' },
    'csharp': { language: 'csharp', version: '6.12.0' },
    'go': { language: 'go', version: '1.16.2' },
    'rust': { language: 'rust', version: '1.68.2' },
    'php': { language: 'php', version: '8.2.3' },
    'ruby': { language: 'ruby', version: '3.0.1' },
    'swift': { language: 'swift', version: '5.3.3' },
    'kotlin': { language: 'kotlin', version: '1.8.20' },
    'scala': { language: 'scala', version: '3.2.2' },
    'bash': { language: 'bash', version: '5.2.0' },
    'powershell': { language: 'powershell', version: '7.1.4' }
};

export async function executePistonCode(socket, payload) {
    const { language, code, fileName } = payload;
    const langInfo = PISTON_LANG_MAP[language];

    if (!langInfo) {
        socket.emit('output', `\n❌ Error: Language '${language}' is not supported in Piston mode.\n`);
        socket.emit('execution_complete');
        return;
    }

    try {
        socket.emit('output', `▶ Executing ${fileName} via Piston API...\n`);
        console.log(`[Piston] Requesting execution for ${language}...`);

        const requestBody = {
            language: langInfo.language,
            version: langInfo.version,
            files: [{ name: fileName, content: code }]
        };

        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log(`[Piston] Response status: ${response.status}`);
        const result = await response.json();

        if (result.run) {
            console.log(`[Piston] Execution successful for ${fileName}`);
            if (result.run.stdout !== undefined) socket.emit('output', result.run.stdout);
            if (result.run.stderr) socket.emit('output', `\nError: ${result.run.stderr}`);
            if (!result.run.stdout && !result.run.stderr && result.run.code === 0) {
                socket.emit('output', '(Process finished with no output)');
            }
            socket.emit('output', `\n\nProcess exited with code ${result.run.code}\n`);
        } else if (result.message) {
            console.warn(`[Piston] API Error: ${result.message}`);
            socket.emit('output', `\n❌ API Error: ${result.message}\n`);
        } else {
            console.error(`[Piston] Unexpected response:`, result);
            socket.emit('output', `\n❌ Unexpected response from execution engine.\n`);
        }

    } catch (error) {
        console.error('[Piston] Connection Error:', error);
        socket.emit('output', `\n❌ Failed to connect to execution engine: ${error.message}\n`);
    } finally {
        socket.emit('execution_complete');
    }
}
