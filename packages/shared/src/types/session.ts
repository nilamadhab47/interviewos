export type SessionStatus = 'created' | 'waiting' | 'active' | 'completed' | 'archived';

export interface SessionPermissions {
  allowAutocomplete: boolean;
  allowPaste: boolean;
  allowAi: boolean;
  allowRunCode: boolean;
}

export interface Session {
  id: string;
  orgId: string;
  title?: string;
  status: SessionStatus;
  createdBy: string;
  questionId?: string;
  language: string;
  permissions: SessionPermissions;
  livekitRoomName?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  durationLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompilationResult {
  id: string;
  sessionId: string;
  participantId?: string;
  language: string;
  code: string;
  stdin?: string;
  stdout?: string;
  stderr?: string;
  status?: string;
  exitCode?: number;
  timeMs?: number;
  memoryKb?: number;
  createdAt: string;
}
