import fetch from 'node-fetch';

async function executePistonCode() {
    const code = `<?php
    echo "Running PHP...";
    if ($_SERVER['REQUEST_METHOD'] == 'POST') {
        echo "POST";
    }
    echo "Done.";
    `;

    const requestBody = {
        language: 'php',
        version: '8.2.3',
        files: [{ name: 'input_test.php', content: code }]
    };

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

executePistonCode();
