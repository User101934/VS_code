const checkRuntimes = async () => {
    try {
        const response = await fetch('https://emkc.org/api/v2/piston/runtimes');
        const data = await response.json();
        const python = data.find(r => r.language === 'python');
        console.log('Python Runtimes:', JSON.stringify(python, null, 2));
    } catch (err) {
        console.error('Failed to fetch runtimes:', err.message);
    }
};
checkRuntimes();
