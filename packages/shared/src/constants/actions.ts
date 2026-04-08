// Socket.IO event names for session signaling
// (Code sync is handled by Yjs, not Socket.IO)

export const SOCKET_EVENTS = {
  // Session lifecycle
  SESSION_JOIN: 'session:join',
  SESSION_LEAVE: 'session:leave',
  SESSION_START: 'session:start',
  SESSION_END: 'session:end',
  SESSION_PARTICIPANT_JOINED: 'session:participant_joined',
  SESSION_PARTICIPANT_LEFT: 'session:participant_left',
  SESSION_STATUS_CHANGED: 'session:status_changed',
  SESSION_PERMISSIONS_CHANGED: 'session:permissions_changed',

  // Compilation
  COMPILE_REQUEST: 'compile:request',
  COMPILE_RESULT: 'compile:result',
  COMPILE_STATUS: 'compile:status',

  // Telemetry
  TELEMETRY_BATCH: 'telemetry:batch',
  TELEMETRY_SUMMARY: 'telemetry:summary',
} as const;
