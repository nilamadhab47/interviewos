import { useEffect } from 'react';
import { getSocket, connectSocket } from '@/lib/socket';

/**
 * Joins the Socket.IO session room for realtime events (question sync, telemetry, etc.).
 */
export function useSessionSocket(sessionId: string | undefined, accessToken: string | undefined) {
  useEffect(() => {
    if (!sessionId || !accessToken) return;

    const socket = getSocket();
    connectSocket(accessToken);

    const join = () => {
      socket.emit('session:join', { sessionId, token: accessToken });
    };

    if (socket.connected) {
      join();
    } else {
      socket.once('connect', join);
    }

    return () => {
      socket.off('connect', join);
      if (socket.connected) {
        socket.emit('session:leave', { sessionId });
      }
    };
  }, [sessionId, accessToken]);
}
