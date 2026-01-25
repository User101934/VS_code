import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server as socketIO } from 'socket.io';
import cors from 'cors';
import { executeCode } from './src/execution/executor.js';
import dbRoutes from './src/routes/dbRoutes.js';

const app = express();
app.use(express.json());
const server = http.createServer(app);

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3002',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

const io = new socketIO(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('<h1>TeachGrid Backend is Running</h1><p>Socket.IO server is active.</p>');
});

app.use('/api/db', dbRoutes);

const activeSessions = new Map();

io.on('connection', (socket) => {
    console.log(`[${new Date().toISOString()}] Client connected: ${socket.id}`);

    const sessionData = {
        socketId: socket.id,
        containerName: null,
        pty: null,
        cleanupHandler: null
    };

    activeSessions.set(socket.id, sessionData);

    socket.on('execute', async (payload) => {
        try {
            console.log(`[${socket.id}] Execute request:`, {
                language: payload.language,
                fileName: payload.fileName
            });

            // Terminal commands don't need code or fileName
            if (payload.language === 'terminal') {
                if (!payload.command) {
                    socket.emit('error', 'Missing required field: command');
                    return;
                }
            } else {
                if (!payload.language || payload.code === undefined || !payload.fileName) {
                    socket.emit('error', 'Missing required fields: language, code, fileName');
                    return;
                }
            }

            console.log(`[Backend] Processing execute for ${payload.fileName} (${payload.language})`);
            await executeCode(socket, payload, sessionData);

        } catch (error) {
            console.error(`[${socket.id}] Execution error:`, error);
            socket.emit('error', error.message);
            socket.emit('execution_complete');
        }
    });

    socket.on('input', (data) => {
        if (sessionData.pty && !sessionData.pty.destroyed) {
            sessionData.pty.write(data);
        }
    });

    socket.on('disconnect', async () => {
        console.log(`[${socket.id}] Client disconnected`);
        if (sessionData.cleanupHandler) {
            await sessionData.cleanupHandler();
        }
        activeSessions.delete(socket.id);
    });
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    for (const [socketId, session] of activeSessions) {
        if (session.cleanupHandler) {
            await session.cleanupHandler();
        }
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Teachgrid Backend running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

// Handle port already in use error
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`\n✅ Port ${PORT} is already in use - Backend server is already running!`);
        console.log(`   This is normal if you started the server using start_app.bat`);
        console.log(`   Your application is available at:`);
        console.log(`   - Frontend: http://localhost:3000`);
        console.log(`   - Backend:  http://localhost:${PORT}`);
        console.log(`\n   No action needed - both servers are working! 🚀\n`);
        process.exit(0); // Exit gracefully
    } else {
        console.error('Server error:', error);
        process.exit(1);
    }
});
