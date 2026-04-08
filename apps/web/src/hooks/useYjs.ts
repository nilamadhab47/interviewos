import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// y-websocket connects to: ws://host/yjs/{roomName}
// In dev, Vite proxies /yjs to the API server
const WS_URL = import.meta.env.VITE_WS_URL
  ? String(import.meta.env.VITE_WS_URL).replace(/^http/, 'ws')
  : `ws://${window.location.host}`;

// Participant colors for cursor awareness
const COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
];

interface UseYjsOptions {
  roomId: string;
  userName: string;
  userRole?: string;
}

export interface YjsState {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  ytext: Y.Text;
  isConnected: boolean;
  isSynced: boolean;
}

export function useYjs({ roomId, userName, userRole }: UseYjsOptions): YjsState | null {
  const [isConnected, setIsConnected] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Stable refs for Yjs objects — only recreated when roomId changes
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);

  // Keep userName/userRole in refs so the effect only depends on roomId
  const userNameRef = useRef(userName);
  const userRoleRef = useRef(userRole);
  userNameRef.current = userName;
  userRoleRef.current = userRole;

  // Track whether we have an active provider
  const [hasProvider, setHasProvider] = useState(false);

  useEffect(() => {
    if (!roomId) return;

    const name = userNameRef.current || 'Anonymous';
    const role = userRoleRef.current || 'unknown';

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText('monaco');

    const provider = new WebsocketProvider(
      `${WS_URL}/yjs`,
      roomId,
      ydoc,
      { connect: true },
    );

    // Set awareness (cursor info)
    const colorIndex = Math.abs(hashCode(name)) % COLORS.length;
    provider.awareness.setLocalStateField('user', {
      name,
      color: COLORS[colorIndex],
      role,
    });

    // Track connection status
    const onStatus = ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
    };
    provider.on('status', onStatus);

    // Track sync status
    const onSync = (synced: boolean) => {
      setIsSynced(synced);
    };
    provider.on('sync', onSync);

    // Store in refs
    ydocRef.current = ydoc;
    providerRef.current = provider;
    ytextRef.current = ytext;
    setHasProvider(true);

    return () => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.awareness.setLocalState(null);
      provider.disconnect();
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      providerRef.current = null;
      ytextRef.current = null;
      setHasProvider(false);
      setIsConnected(false);
      setIsSynced(false);
    };
    // ONLY depend on roomId — userName/userRole are read from refs
  }, [roomId]);

  // Update awareness when userName changes (without recreating provider)
  useEffect(() => {
    if (!providerRef.current) return;
    const colorIndex = Math.abs(hashCode(userName)) % COLORS.length;
    providerRef.current.awareness.setLocalStateField('user', {
      name: userName,
      color: COLORS[colorIndex],
      role: userRole || 'unknown',
    });
  }, [userName, userRole]);

  // Return a state object — the identity changes only when the provider changes
  // or when connection status changes, which is fine for UI rendering
  if (!hasProvider || !ydocRef.current || !providerRef.current || !ytextRef.current) {
    return null;
  }

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    ytext: ytextRef.current,
    isConnected,
    isSynced,
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
