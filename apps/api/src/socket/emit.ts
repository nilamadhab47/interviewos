import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@interviewos/shared';

let io: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export function setSocketServer(
  server: Server<ClientToServerEvents, ServerToClientEvents>,
): void {
  io = server;
}

export function emitToSession<E extends keyof ServerToClientEvents>(
  sessionId: string,
  event: E,
  data: Parameters<ServerToClientEvents[E]>[0],
): void {
  io?.to(sessionId).emit(event, data);
}
