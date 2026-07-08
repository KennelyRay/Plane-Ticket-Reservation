import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Joins the flight's seat-map room and refreshes the cached seat map
 * whenever another client locks, releases, or books a seat.
 */
export function useSeatSocket(flightId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!flightId) return;

    // Same origin in dev (Vite proxies /socket.io); the API server's origin in production
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    const socket = apiUrl?.startsWith('http')
      ? io(new URL(apiUrl).origin, { withCredentials: true })
      : io({ withCredentials: true });
    socket.emit('seatmap:join', flightId);

    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['seatmap', flightId] });
    };
    socket.on('seat:locked', refresh);
    socket.on('seat:released', refresh);
    socket.on('seat:booked', refresh);

    return () => {
      socket.emit('seatmap:leave', flightId);
      socket.disconnect();
    };
  }, [flightId, queryClient]);
}
