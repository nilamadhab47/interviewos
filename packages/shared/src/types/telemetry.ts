export type TelemetryEventType =
  | 'keystroke_burst'
  | 'paste'
  | 'copy'
  | 'compile'
  | 'tab_switch'
  | 'idle_start'
  | 'idle_end'
  | 'language_change';

export interface TelemetryEvent {
  id?: string;
  sessionId: string;
  participantId: string;
  eventType: TelemetryEventType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface TelemetrySummary {
  totalKeystrokes: number;
  compileCount: number;
  pasteCount: number;
  tabSwitchCount: number;
  currentWpm: number;
  isIdle: boolean;
  idleDurationMs: number;
}
