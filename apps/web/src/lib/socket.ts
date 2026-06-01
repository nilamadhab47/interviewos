import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@interviewos/shared';
import { getSocketHttpUrl } from '@/lib/realtimeUrl';

const SOCKET_URL = getSocketHttpUrl();

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      autoConnect: false,
      withCredentials: true,
    });
  }
  return socket;
}

export function connectSocket(token: string): void {
  const s = getSocket();
  const prev = (s.auth as { token?: string } | undefined)?.token;
  s.auth = { token };

  if (!s.connected) {
    s.connect();
    return;
  }

  if (prev !== token) {
    s.disconnect();
    s.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
