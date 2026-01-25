import express from 'express';
import DBHandler from '../services/dbHandler.js';

const router = express.Router();
const connections = new Map();

router.post('/connect', async (req, res) => {
    const { uri } = req.body;
    try {
        const connection = await DBHandler.connect(uri);
        const connectionId = Date.now().toString();
        connections.set(connectionId, { ...connection, uri });

        const maskedUri = uri.replace(/\/\/.*:.*@/, '//****:****@');

        res.json({
            success: true,
            id: connectionId,
            type: connection.type,
            uri: maskedUri
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

router.get('/:id/explore', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    try {
        const metadata = await DBHandler.fetchMetadata(connection);
        res.json(metadata);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:id/query', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    const { query, context } = req.body;
    try {
        const result = await DBHandler.runQuery(connection, query, context);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:id/insert', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    try {
        const result = await DBHandler.insertRecord(connection, req.body);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id/update', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    try {
        const result = await DBHandler.updateRecord(connection, req.body);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:id/create-db', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    const { dbName } = req.body;
    if (!dbName) return res.status(400).json({ message: 'Database name is required' });

    try {
        const result = await DBHandler.createDatabase(connection, dbName);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/:id/create-table', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    const { dbName, tableName } = req.body;
    if (!dbName || !tableName) return res.status(400).json({ message: 'Database and Table names are required' });

    try {
        const result = await DBHandler.createTable(connection, dbName, tableName);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id/delete', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (!connection) return res.status(404).json({ message: 'Connection not found' });

    try {
        const result = await DBHandler.deleteRecord(connection, req.body);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const connection = connections.get(req.params.id);
    if (connection) {
        await DBHandler.disconnect(connection);
        connections.delete(req.params.id);
    }
    res.json({ success: true });
});

export default router;
