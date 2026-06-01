/** HTTP origin for Socket.IO (empty = same origin / Vite proxy). */
export function getSocketHttpUrl(): string {
  const api = import.meta.env.VITE_API_URL;
  if (api) return String(api).replace(/\/$/, '');
  return '';
}

/** WebSocket base URL for Yjs (no path suffix). */
export function getWsBaseUrl(): string {
  const explicit = import.meta.env.VITE_WS_URL;
  if (explicit) {
    return String(explicit).replace(/^http/i, 'ws').replace(/\/$/, '');
  }

  const api = import.meta.env.VITE_API_URL;
  if (api) {
    return String(api).replace(/^http/i, 'ws').replace(/\/$/, '');
  }

  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}`;
}
