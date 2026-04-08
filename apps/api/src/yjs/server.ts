import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server as HttpServer } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const MSG_AUTH = 2;
const MSG_QUERY_AWARENESS = 3;

// Store documents in memory (per session)
const docs = new Map<string, {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Map<WebSocket, Set<number>>;
}>();

function getOrCreateDoc(roomName: string) {
  let room = docs.get(roomName);
  if (!room) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    // Clean up awareness when a client disconnects
    awareness.on('update', ({ added, updated, removed }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const changedClients = added.concat(updated, removed);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_AWARENESS);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients),
      );
      const buf = encoding.toUint8Array(encoder);
      const r = docs.get(roomName);
      if (r) {
        r.conns.forEach((_, conn) => {
          if (conn.readyState === WebSocket.OPEN) {
            conn.send(buf);
          }
        });
      }
    });

    room = { doc, awareness, conns: new Map() };
    docs.set(roomName, room);
  }
  return room;
}

function handleMessage(conn: WebSocket, room: ReturnType<typeof getOrCreateDoc>, message: Uint8Array) {
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
      // Client is asking for all awareness states
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
  // Send sync step 1
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MSG_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));
}

function sendAwareness(conn: WebSocket, awareness: awarenessProtocol.Awareness) {
  const states = awareness.getStates();
  if (states.size > 0) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MSG_AWARENESS);
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        awareness,
        Array.from(states.keys()),
      ),
    );
    conn.send(encoding.toUint8Array(encoder));
  }
}

export function setupYjsServer(httpServer: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade on /yjs/* path
  // y-websocket client connects to: ws://host/yjs/{roomName}
  httpServer.on('upgrade', (request: IncomingMessage, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    if (url.pathname.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Let socket.io handle its own upgrades (it won't match /yjs)
  });

  wss.on('connection', (conn: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    // y-websocket sends: /yjs/{roomName}?... — extract room from path
    const pathParts = url.pathname.split('/').filter(Boolean); // ['yjs', 'roomName']
    const roomName = pathParts[1] || url.searchParams.get('room');

    if (!roomName) {
      conn.close(4000, 'Missing room parameter');
      return;
    }

    const room = getOrCreateDoc(roomName);
    room.conns.set(conn, new Set());

    console.log(`[Yjs] Client connected to room: ${roomName} (${room.conns.size} clients)`);

    // Send initial sync
    sendSync(conn, room.doc);
    sendAwareness(conn, room.awareness);

    // Listen for doc updates and broadcast to other clients.
    // Use the connection as origin so we can skip broadcasting back to the sender.
    const docUpdateHandler = (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MSG_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      const buf = encoding.toUint8Array(encoder);

      room.conns.forEach((_, c) => {
        // Don't echo back to the origin connection
        if (c !== origin && c.readyState === WebSocket.OPEN) {
          c.send(buf);
        }
      });
    };
    room.doc.on('update', docUpdateHandler);

    conn.on('message', (data: ArrayBuffer | Buffer) => {
      // IMPORTANT: Buffer.buffer returns the pooled ArrayBuffer which is much larger
      // than the actual message. We must copy just the message bytes.
      const message = new Uint8Array(data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
      handleMessage(conn, room, message);
    });

    conn.on('close', () => {
      room.doc.off('update', docUpdateHandler);

      // Remove awareness states for this client
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

      // Clean up empty rooms after a delay
      if (room.conns.size === 0) {
        setTimeout(() => {
          const r = docs.get(roomName);
          if (r && r.conns.size === 0) {
            r.doc.destroy();
            docs.delete(roomName);
            console.log(`[Yjs] Room destroyed: ${roomName}`);
          }
        }, 30000); // 30 second grace period
      }
    });
  });

  console.log('[Yjs] WebSocket server ready on /yjs');
  return wss;
}

// Export for snapshot/persistence
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
