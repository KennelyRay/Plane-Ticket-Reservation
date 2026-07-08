import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export const initSocket = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    // Seat events carry only public seat ids and the socket never sees
    // credentials, so reflect any origin rather than pinning CLIENT_URL —
    // a mismatch (trailing slash, preview deploys) silently kills live updates.
    cors: { origin: true },
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
