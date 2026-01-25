import crypto from 'crypto';

export function sanitizeInput(input) {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    return input.replace(/\0/g, '');
}

export function generateContainerName(socketId) {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    return `teachgrid_` + socketId.substring(0, 8) + `_` + timestamp + `_` + random;
}
