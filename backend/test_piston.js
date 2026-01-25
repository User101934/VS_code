const testPiston = async () => {
    console.log('Testing Piston API connectivity...');
    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: 'python',
                version: '3.10.0',
                files: [{ name: 'test.py', content: 'print("Piston Connectivity OK")' }]
            })
        });
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error('Connection failed:', err.message);
    }
};
testPiston();
