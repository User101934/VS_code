import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { Server as socketIO } from 'socket.io';
import cors from 'cors';
import { executeCode } from './src/execution/executor.js';
import dbRoutes from './src/routes/dbRoutes.js';
import TerminalManager from './src/utils/TerminalManager.js';

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

    // --- TERMINAL EVENTS ---
    socket.on('terminal:init', () => {
        // Initialize session (sets CWD)
        TerminalManager.createSession(socket.id);
        console.log(`[${socket.id}] Terminal session initialized (Spawn Mode)`);
    });

    socket.on('terminal:input', (data) => {
        // Handle input dispatch (Command or Stdin)
        TerminalManager.handleInput(socket.id, data, socket);
    });

    socket.on('terminal:resize', ({ cols, rows }) => {
        // No-op for spawn mode but kept for compatibility
    });

    // --- FILE OPERATIONS ---
    socket.on('file:save', (data) => {
        try {
            // Root is one level up from backend/server.js
            const projectRoot = path.resolve(__dirname, '..');
            // Prevent directory traversal
            const safePath = path.normalize(data.path).replace(/^(\.\.[\/\\])+/, '');
            const fullPath = path.join(projectRoot, safePath);

            // Ensure directory exists
            fs.mkdirSync(path.dirname(fullPath), { recursive: true });

            fs.writeFileSync(fullPath, data.content || '');
            console.log(`[File] Saved: ${safePath}`);
            socket.emit('file:saved', { path: data.path });
        } catch (err) {
            console.error(`[File] Save error:`, err);
            socket.emit('error', `Failed to save file: ${err.message}`);
        }
    });

    socket.on('disconnect', async () => {
        console.log(`[${socket.id}] Client disconnected`);
        if (sessionData.cleanupHandler) {
            await sessionData.cleanupHandler();
        }

        // Use TerminalManager clean up
        TerminalManager.kill(socket.id);

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
