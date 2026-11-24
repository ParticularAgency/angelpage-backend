"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwtSecret_js_1 = require("../config/jwtSecret.js");
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
    io.use((socket, next) => {
        var _a, _b;
        const header = (_a = socket.handshake.headers) === null || _a === void 0 ? void 0 : _a.authorization;
        const raw = ((_b = socket.handshake.auth) === null || _b === void 0 ? void 0 : _b.token) ||
            (typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '');
        if (!raw) {
            next(new Error('Unauthorized'));
            return;
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(raw, jwtSecret_js_1.JWT_SECRET);
            if (!decoded.userId || decoded.type === 'refresh') {
                next(new Error('Unauthorized'));
                return;
            }
            socket.data.userId = String(decoded.userId);
            next();
        }
        catch (_c) {
            next(new Error('Unauthorized'));
        }
    });
    io.on('connection', (socket) => {
        const userId = String(socket.data.userId || '');
        console.log(`Socket connected: ${socket.id}`);
        if (userId) {
            socket.join(`user:${userId}`);
        }
        socket.on('join-user', (requestedId) => {
            if (requestedId && String(requestedId) === userId) {
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
