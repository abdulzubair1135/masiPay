import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { ENV } from '../config/env.js';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', // Controlled via reverse proxy and API CORS
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

    // Auto-join rooms securely based on verified JWT role
    if (user) {
      socket.join(`user-${user.userId}`);
      if (user.role === 'STAFF' || user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        socket.join('staff-room');
        console.log(`[Socket] Authorized: ${user.name} (${user.role}) joined staff-room`);
      }
    }

    // Explicit room joining with strict RBAC validation
    socket.on('join:room', (room: string) => {
      // Prevent students from listening in on staff-room
      if (room === 'staff-room' || room === 'admin-room') {
        if (!user || (user.role !== 'STAFF' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
          console.warn(`[Socket Security] Unauthorized attempt by ${socket.id} to join ${room}`);
          return;
        }
      }

      socket.join(room);
    });

    socket.on('leave:room', (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {});
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};
