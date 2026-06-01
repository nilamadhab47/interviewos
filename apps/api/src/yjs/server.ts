import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { hydrateYjsDocument } from '../services/yjs-hydrate.service';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_QUERY_AWARENESS = 3;

type Room = {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
};

const docs = new Map<string, Room>();
const hydrationScheduled = new Set<string>();

function scheduleRoomHydration(roomName: string, doc: Y.Doc) {
  if (hydrationScheduled.has(roomName)) return;
  hydrationScheduled.add(roomName);

  void hydrateYjsDocument(roomName, doc)
    .catch((err) => {
      console.error(`[Yjs] Hydration failed for room ${roomName}:`, err);
    })
    .finally(() => {
      hydrationScheduled.delete(roomName);
    });
}

function broadcastToRoom(room: Room, buf: Uint8Array, exclude?: WebSocket) {
  room.conns.forEach((_, conn) => {
    if (conn !== exclude && conn.readyState === WebSocket.OPEN) {
      conn.send(buf);
    }
  });
}

function getOrCreateDoc(roomName: string): Room {
  const existing = docs.get(roomName);
  if (existing) return existing;

  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  const room: Room = { doc, awareness, conns: new Map() };

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    broadcastToRoom(room, encoding.toUint8Array(encoder), origin as WebSocket);
  });

  awareness.on('update', ({ added, updated, removed }) => {
    const changedClients = added.concat(updated, removed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
    );
    broadcastToRoom(room, encoding.toUint8Array(encoder));
  });

  docs.set(roomName, room);
  scheduleRoomHydration(roomName, doc);
  return room;
}

function handleMessage(conn: WebSocket, room: Room, message: Uint8Array) {
  const decoder = decoding.createDecoder(message);
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MSG_SYNC: {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
      if (encoding.length(encoder) > 1) {
        conn.send(encoding.toUint8Array(encoder));
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

    const room = getOrCreateDoc(roomName);
    room.conns.set(conn, new Set());

    console.log(`[Yjs] Client connected to room: ${roomName} (${room.conns.size} clients)`);

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

      console.log(`[Yjs] Client disconnected from room: ${roomName} (${room.conns.size} clients)`);

      if (room.conns.size === 0) {
        setTimeout(() => {
          const r = docs.get(roomName);
          if (r && r.conns.size === 0) {
            r.doc.destroy();
            docs.delete(roomName);
            console.log(`[Yjs] Room destroyed: ${roomName}`);
          }
        }, 30000);
      }
    });
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
  return room.doc.getText('monaco').toString();
}
