import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { ENV } from '../config/env.js';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Allow all origins for dev/PWA
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = verifyToken(token);
        (socket as any).user = decoded;
      } catch (err) {
        console.log('[Socket] Unauthenticated connection:', socket.id);
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] Client connected: ${socket.id} (User: ${user ? user.role + ' - ' + user.name : 'Guest'})`);

    // Auto-join rooms based on role
    if (user) {
      socket.join(`user-${user.userId}`);
      if (user.role === 'STAFF' || user.role === 'SUPER_ADMIN') {
        socket.join('staff-room');
        console.log(`[Socket] User ${user.name} joined staff-room`);
      }
    }

    // Explicit room joining
    socket.on('join:room', (room: string) => {
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined room: ${room}`);
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
      console.log(`[Socket] ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};
