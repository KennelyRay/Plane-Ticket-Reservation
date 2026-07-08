import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.on('connection', (socket) => {
    // Clients join a room per flight to receive live seat updates
    socket.on('seatmap:join', (flightId: string) => {
      socket.join(`flight:${flightId}`);
    });

    socket.on('seatmap:leave', (flightId: string) => {
      socket.leave(`flight:${flightId}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
};

// Broadcast helpers used by the seat-locking service
export const emitSeatLocked = (flightId: string, seatId: string) => {
  getIO().to(`flight:${flightId}`).emit('seat:locked', { seatId });
};

export const emitSeatReleased = (flightId: string, seatId: string) => {
  getIO().to(`flight:${flightId}`).emit('seat:released', { seatId });
};

export const emitSeatBooked = (flightId: string, seatId: string) => {
  getIO().to(`flight:${flightId}`).emit('seat:booked', { seatId });
};
