const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
    res.json({ status: 'OK', message: 'Backend running successfully 🚀' });
});

// Sample API
app.post('/api/test', (req, res) => {
    const { name } = req.body;
    res.json({
        success: true,
        message: `Hello ${name}, API working perfectly!`
    });
});

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
