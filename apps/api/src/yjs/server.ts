import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { hydrateYjsDocument } from '../services/yjs-hydrate.service';
import { saveYjsDocument, getMonacoText } from '../services/yjs-doc.service';
import { getSession } from '../services/session.service';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_QUERY_AWARENESS = 3;

const PERSIST_DEBOUNCE_MS = 2000;
const ROOM_DESTROY_DELAY_MS = 30000;

type Room = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
  language: string;
  persistTimer: ReturnType<typeof setTimeout> | null;
};

const docs = new Map<string, Room>();
const roomInitPromises = new Map<string, Promise<Room>>();

function broadcastToRoom(room: Room, buf: Uint8Array, exclude?: WebSocket) {
  room.conns.forEach((_, conn) => {
    if (conn !== exclude && conn.readyState === WebSocket.OPEN) {
      conn.send(buf);
    }
  });
}

function schedulePersist(sessionId: string, room: Room) {
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.persistTimer = setTimeout(() => {
    room.persistTimer = null;
    void persistRoom(sessionId, room).catch((err) => {
      console.error(`[Yjs] Persist failed for ${sessionId}:`, err);
    });
  }, PERSIST_DEBOUNCE_MS);
}

async function persistRoom(sessionId: string, room: Room): Promise<void> {
  const text = getMonacoText(room.doc);
  if (!text.trim()) return;
  await saveYjsDocument(sessionId, room.doc, room.language);
}

export async function flushYjsDocument(
  sessionId: string,
  language?: string,
): Promise<void> {
  const room = docs.get(sessionId);
  if (!room) return;

  if (room.persistTimer) {
    clearTimeout(room.persistTimer);
    room.persistTimer = null;
  }

  if (language) room.language = language;
  await persistRoom(sessionId, room);
}

export function getLiveRoomDoc(sessionId: string): Y.Doc | null {
  return docs.get(sessionId)?.doc ?? null;
}

function broadcastDocUpdate(room: Room, update: Uint8Array, exclude?: WebSocket) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_SYNC);
  syncProtocol.writeUpdate(encoder, update);
  broadcastToRoom(room, encoding.toUint8Array(encoder), exclude);
}

function setupRoomListeners(sessionId: string, room: Room) {
  room.doc.on('update', (update: Uint8Array, origin: unknown) => {
    schedulePersist(sessionId, room);
    broadcastDocUpdate(room, update, origin as WebSocket);
  });

  room.awareness.on('update', ({ added, updated, removed }) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, changedClients),
    );
    broadcastToRoom(room, encoding.toUint8Array(encoder));
  });
}

async function createRoom(sessionId: string): Promise<Room> {
  const session = await getSession(sessionId);
  const language = session?.language ?? 'javascript';

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  const room: Room = {
    doc,
    awareness,
    conns: new Map(),
    language,
    persistTimer: null,
  };

  setupRoomListeners(sessionId, room);
  await hydrateYjsDocument(sessionId, doc);
  docs.set(sessionId, room);
  return room;
}

function getOrCreateDoc(sessionId: string): Promise<Room> {
  const existing = docs.get(sessionId);
  if (existing) return Promise.resolve(existing);

  let promise = roomInitPromises.get(sessionId);
  if (!promise) {
    promise = createRoom(sessionId).finally(() => {
      roomInitPromises.delete(sessionId);
    });
    roomInitPromises.set(sessionId, promise);
  }
  return promise;
}

function handleMessage(conn: WebSocket, room: Room, message: Uint8Array) {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MSG_SYNC: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
      const reply = encoding.toUint8Array(encoder);
      if (reply.length > 1) {
        conn.send(reply);
      }
      break;
    }
    case MSG_AWARENESS: {
      const update = decoding.readVarUint8Array(decoder);
      awarenessProtocol.applyAwarenessUpdate(room.awareness, update, conn);
      break;
    }
    case MSG_QUERY_AWARENESS: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(
          room.awareness,
          Array.from(room.awareness.getStates().keys()),
        ),
      );
      conn.send(encoding.toUint8Array(encoder));
      break;
    }
  }
}

function sendSync(conn: WebSocket, doc: Y.Doc) {
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));
}

function sendAwareness(conn: WebSocket, awareness: awarenessProtocol.Awareness) {
  const states = awareness.getStates();
  if (states.size === 0) return;

  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_AWARENESS);
  encoding.writeVarUint8Array(
    encoder,
    awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(states.keys())),
  );
  conn.send(encoding.toUint8Array(encoder));
}

async function destroyRoomWhenIdle(sessionId: string) {
  setTimeout(async () => {
    const room = docs.get(sessionId);
    if (!room || room.conns.size > 0) return;

    await flushYjsDocument(sessionId);

    room.doc.destroy();
    docs.delete(sessionId);
    console.log(`[Yjs] Room destroyed: ${sessionId}`);
  }, ROOM_DESTROY_DELAY_MS);
}

export function setupYjsServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (conn: WebSocket, req: IncomingMessage) => {
    conn.binaryType = 'arraybuffer';

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const roomName = pathParts[1] || url.searchParams.get('room');

    if (!roomName) {
      conn.close(4000, 'Missing room parameter');
      return;
    }

    void (async () => {
      try {
        const room = await getOrCreateDoc(roomName);
        room.conns.set(conn, new Set());

        console.log(
          `[Yjs] Client connected to room: ${roomName} (${room.conns.size} clients)`,
        );

        sendSync(conn, room.doc);
        sendAwareness(conn, room.awareness);

        conn.on('message', (data: ArrayBuffer | Buffer) => {
          const message = new Uint8Array(
            data instanceof ArrayBuffer
              ? data
              : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
          );
          handleMessage(conn, room, message);
        });

        conn.on('close', () => {
          const controlledIds = room.conns.get(conn);
          room.conns.delete(conn);

          if (controlledIds) {
            awarenessProtocol.removeAwarenessStates(
              room.awareness,
              Array.from(controlledIds),
              null,
            );
          }

          console.log(
            `[Yjs] Client disconnected from room: ${roomName} (${room.conns.size} clients)`,
          );

          if (room.conns.size === 0) {
            void destroyRoomWhenIdle(roomName);
          }
        });
      } catch (err) {
        console.error(`[Yjs] Connection setup failed for ${roomName}:`, err);
        conn.close(1011, 'Room initialization failed');
      }
    })();
  });

  console.log('[Yjs] WebSocket server ready on /yjs');
  return wss;
}

export function getDocState(roomName: string): Uint8Array | null {
  const room = docs.get(roomName);
  if (!room) return null;
  return Y.encodeStateAsUpdate(room.doc);
}

export function getDocText(roomName: string): string | null {
  const room = docs.get(roomName);
  if (!room) return null;
  return getMonacoText(room.doc);
}
