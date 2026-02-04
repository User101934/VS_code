import { executeLocalCode } from './src/execution/localExecutor.js';

const mockSocket = {
    emit: (event, data) => {
        if (event === 'output') console.log(data);
    },
    _ptyProcess: null
};

console.log('--- TEST START ---');
try {
    await executeLocalCode(mockSocket, {
        language: 'php',
        code: '<?php echo "METHOD: " . ($_SERVER["REQUEST_METHOD"] ?? "MISSING") . "\\n"; echo "REDIRECT_STATUS: " . ($_SERVER["REDIRECT_STATUS"] ?? "MISSING"); ?>',
        fileName: 'test.php'
    });
} catch (e) {
    console.error('Execution failed:', e);
}

// Allow time for output
setTimeout(() => {
    console.log('--- TEST END ---');
    process.exit(0);
}, 2000);
