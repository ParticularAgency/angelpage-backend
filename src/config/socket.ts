import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwtSecret.js';

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const header = socket.handshake.headers?.authorization;
    const raw =
      (socket.handshake.auth?.token as string | undefined) ||
      (typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '');
    if (!raw) {
      next(new Error('Unauthorized'));
      return;
    }
    try {
      const decoded = jwt.verify(raw, JWT_SECRET) as JwtPayload & {
        userId?: string;
        type?: string;
      };
      if (!decoded.userId || decoded.type === 'refresh') {
        next(new Error('Unauthorized'));
        return;
      }
      socket.data.userId = String(decoded.userId);
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = String(socket.data.userId || '');
    console.log(`Socket connected: ${socket.id}`);
    if (userId) {
      socket.join(`user:${userId}`);
    }

    socket.on('join-user', (requestedId: string) => {
      if (requestedId && String(requestedId) === userId) {
        socket.join(`user:${userId}`);
      }
    });

    socket.on('join-conversation', (conversationId: string) => {
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    socket.on('leave-conversation', (conversationId: string) => {
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

    socket.on('new-notification', (data: unknown) => {
      console.log('New notification received:', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export { io };
