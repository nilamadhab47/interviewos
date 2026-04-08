import type { SessionPermissions, SessionStatus, CompilationResult } from './session';
import type { TelemetryEvent, TelemetrySummary } from './telemetry';
import type { Participant } from './user';

export interface ServerToClientEvents {
  'session:participant_joined': (data: {
    participant: Participant;
    participants: Participant[];
  }) => void;
  'session:participant_left': (data: { participantId: string }) => void;
  'session:status_changed': (data: { status: SessionStatus }) => void;
  'session:permissions_changed': (data: {
    permissions: SessionPermissions;
  }) => void;
  'compile:result': (data: CompilationResult) => void;
  'compile:status': (data: { isCompiling: boolean }) => void;
  'telemetry:summary': (data: TelemetrySummary) => void;
}

export interface ClientToServerEvents {
  'session:join': (data: { sessionId: string; token: string }) => void;
  'session:leave': (data: { sessionId: string }) => void;
  'session:start': (data: { sessionId: string }) => void;
  'session:end': (data: { sessionId: string }) => void;
  'session:update_permissions': (data: {
    sessionId: string;
    permissions: Partial<SessionPermissions>;
  }) => void;
  'compile:request': (data: {
    sessionId: string;
    code: string;
    languageId: number;
    stdin?: string;
  }) => void;
  'telemetry:batch': (data: {
    sessionId: string;
    events: TelemetryEvent[];
  }) => void;
}
