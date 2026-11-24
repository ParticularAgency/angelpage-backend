"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io = null;
exports.io = io;
const initSocket = (server) => {
    exports.io = io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        console.log(`Socket connected: ${socket.id}`);
        socket.on('join-user', (userId) => {
            if (userId) {
                socket.join(`user:${userId}`);
            }
        });
        socket.on('join-conversation', (conversationId) => {
            if (conversationId) {
                socket.join(`conversation:${conversationId}`);
            }
        });
        socket.on('leave-conversation', (conversationId) => {
            if (conversationId) {
                socket.leave(`conversation:${conversationId}`);
            }
        });
        socket.on('typing', ({ conversationId, userId, isTyping }) => {
            if (conversationId && userId) {
                socket.to(`conversation:${conversationId}`).emit('user-typing', {
                    conversationId,
                    userId,
                    isTyping: Boolean(isTyping),
                });
            }
        });
        socket.on('new-notification', (data) => {
            console.log('New notification received:', data);
        });
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};
exports.getIO = getIO;
