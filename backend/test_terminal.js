
import TerminalManager from './src/utils/TerminalManager.js';

// Mock Socket
const mockSocket = {
    id: 'test-socket-1',
    emit: (event, data) => {
        console.log(`[Socket Emit] ${event}:`, data);
    }
};

console.log("Testing 'dir' command...");
TerminalManager.handleInput(mockSocket.id, 'dir', mockSocket);

setTimeout(() => {
    console.log("\nTesting 'cd ..' then 'dir'...");
    TerminalManager.handleInput(mockSocket.id, 'cd ..', mockSocket);
    // Give cd a moment (it's fs access async)
    setTimeout(() => {
        TerminalManager.handleInput(mockSocket.id, 'dir', mockSocket);
    }, 500);
}, 2000);
