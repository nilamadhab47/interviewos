import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { getWsBaseUrl } from '@/lib/realtimeUrl';

const YJS_BASE = `${getWsBaseUrl()}/yjs`;

const COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

const DESTROY_DELAY_MS = 500;

export interface YjsRoom {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  ytext: Y.Text;
  isConnected: boolean;
  isSynced: boolean;
}

type RoomEntry = YjsRoom & {
  refcount: number;
  destroyTimer: ReturnType<typeof setTimeout> | null;
  subscribers: Set<() => void>;
};

const rooms = new Map<string, RoomEntry>();

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function notify(entry: RoomEntry) {
  entry.subscribers.forEach((fn) => fn());
}

function setAwareness(entry: RoomEntry, userName: string, userRole: string) {
  const colorIndex = Math.abs(hashCode(userName)) % COLORS.length;
  entry.provider.awareness.setLocalStateField('user', {
    name: userName,
    color: COLORS[colorIndex],
    role: userRole,
  });
}

function createRoom(roomId: string, userName: string, userRole: string): RoomEntry {
  const ydoc = new Y.Doc();
  const ytext = ydoc.getText('monaco');

  const provider = new WebsocketProvider(YJS_BASE, roomId, ydoc, {
    connect: true,
    disableBc: true,
    /** Re-request server state periodically if sync was missed */
    resyncInterval: 5000,
  });

  const entry: RoomEntry = {
    ydoc,
    provider,
    ytext,
    isConnected: false,
    isSynced: false,
    refcount: 0,
    destroyTimer: null,
    subscribers: new Set(),
  };

  const onStatus = ({ status }: { status: string }) => {
    const connected = status === 'connected';
    if (entry.isConnected !== connected) {
      entry.isConnected = connected;
      notify(entry);
    }
  };

  const onSync = (synced: boolean) => {
    if (entry.isSynced !== synced) {
      entry.isSynced = synced;
      notify(entry);
    }
  };

  provider.on('status', onStatus);
  provider.on('sync', onSync);
  provider.on('connection-error', (event: Event) => {
    console.error('[Yjs] Connection error:', event);
  });
  provider.on('connection-close', () => {
    entry.isConnected = false;
    entry.isSynced = false;
    notify(entry);
  });

  // Store handlers for teardown
  (entry as RoomEntry & { _onStatus: typeof onStatus; _onSync: typeof onSync })._onStatus =
    onStatus;
  (entry as RoomEntry & { _onSync: typeof onSync })._onSync = onSync;

  setAwareness(entry, userName, userRole);
  rooms.set(roomId, entry);
  return entry;
}

function destroyRoom(roomId: string, entry: RoomEntry) {
  const ext = entry as RoomEntry & {
    _onStatus?: (arg: { status: string }) => void;
    _onSync?: (synced: boolean) => void;
  };

  if (ext._onStatus) {
    entry.provider.off('status', ext._onStatus);
  }
  if (ext._onSync) {
    entry.provider.off('sync', ext._onSync);
  }

  entry.provider.awareness.setLocalState(null);

  try {
    if (entry.provider.wsconnected) {
      entry.provider.disconnect();
    }
  } catch {
    // WebSocket may not have finished opening (React Strict Mode)
  }

  entry.provider.destroy();
  entry.ydoc.destroy();
  rooms.delete(roomId);
}

/**
 * Acquire a shared Yjs room (ref-counted). Survives React Strict Mode double-mount.
 */
export function acquireYjsRoom(
  roomId: string,
  userName: string,
  userRole: string,
  onChange: () => void,
): YjsRoom | null {
  if (!roomId) return null;

  let entry = rooms.get(roomId);

  if (entry?.destroyTimer) {
    clearTimeout(entry.destroyTimer);
    entry.destroyTimer = null;
  }

  if (!entry) {
    entry = createRoom(roomId, userName, userRole);
  } else {
    setAwareness(entry, userName, userRole);
  }

  entry.refcount += 1;
  entry.subscribers.add(onChange);

  return entry;
}

export function releaseYjsRoom(roomId: string, onChange: () => void): void {
  const entry = rooms.get(roomId);
  if (!entry) return;

  entry.subscribers.delete(onChange);
  entry.refcount = Math.max(0, entry.refcount - 1);

  if (entry.refcount > 0) return;

  if (entry.destroyTimer) {
    clearTimeout(entry.destroyTimer);
  }

  entry.destroyTimer = setTimeout(() => {
    const current = rooms.get(roomId);
    if (!current || current.refcount > 0) return;
    destroyRoom(roomId, current);
  }, DESTROY_DELAY_MS);
}

export function updateYjsRoomAwareness(
  roomId: string,
  userName: string,
  userRole: string,
): void {
  const entry = rooms.get(roomId);
  if (entry) {
    setAwareness(entry, userName, userRole);
  }
}

export function getYjsRoom(roomId: string): YjsRoom | null {
  const entry = rooms.get(roomId);
  if (!entry) return null;
  return {
    ydoc: entry.ydoc,
    provider: entry.provider,
    ytext: entry.ytext,
    isConnected: entry.isConnected,
    isSynced: entry.isSynced,
  };
}
