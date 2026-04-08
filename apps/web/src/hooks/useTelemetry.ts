import { useEffect, useRef, useCallback } from 'react';
import type { TelemetryEvent, TelemetryEventType } from '@interviewos/shared';
import { getSocket, connectSocket } from '@/lib/socket';

const FLUSH_INTERVAL_MS = 2000;
const IDLE_THRESHOLD_MS = 30000;

interface UseTelemetryOptions {
  sessionId: string;
  participantId: string;
  accessToken: string;
  enabled?: boolean;
}

export function useTelemetry({
  sessionId,
  participantId,
  accessToken,
  enabled = true,
}: UseTelemetryOptions) {
  const bufferRef = useRef<TelemetryEvent[]>([]);
  const keystrokeCountRef = useRef(0);
  const keystrokeBurstStartRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushEvent = useCallback(
    (eventType: TelemetryEventType, payload: Record<string, unknown>) => {
      if (!enabled) return;
      bufferRef.current.push({
        sessionId,
        participantId,
        eventType,
        payload,
        createdAt: new Date().toISOString(),
      });
    },
    [sessionId, participantId, enabled],
  );

  // Flush buffer via Socket.IO
  const flush = useCallback(() => {
    const events = bufferRef.current.splice(0);
    if (events.length === 0) return;
    try {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('telemetry:batch', { sessionId, events });
      }
    } catch {
      // silently fail — telemetry is non-critical
    }
  }, [sessionId]);

  // Idle detection helpers
  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  }, []);

  const resetIdleTimer = useCallback(() => {
    clearIdleTimer();
    if (isIdleRef.current) {
      isIdleRef.current = false;
      pushEvent('idle_end', { idleDurationMs: 0 }); // duration handled server-side
    }
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      pushEvent('idle_start', {});
    }, IDLE_THRESHOLD_MS);
  }, [clearIdleTimer, pushEvent]);

  // Keystroke burst tracking
  const handleKeystroke = useCallback(() => {
    if (!enabled) return;
    keystrokeCountRef.current += 1;
    resetIdleTimer();

    const now = Date.now();
    const elapsed = now - keystrokeBurstStartRef.current;

    if (elapsed >= 5000) {
      const wpm = Math.round((keystrokeCountRef.current / 5) * 60 / 5); // chars/s * 60 / 5 = wpm approx
      pushEvent('keystroke_burst', {
        charCount: keystrokeCountRef.current,
        durationMs: elapsed,
        wpm,
      });
      keystrokeCountRef.current = 0;
      keystrokeBurstStartRef.current = now;
    }
  }, [enabled, pushEvent, resetIdleTimer]);

  // Paste event
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled) return;
      const text = e.clipboardData?.getData('text') || '';
      pushEvent('paste', {
        textLength: text.length,
        contentHash: simpleHash(text),
      });
    },
    [enabled, pushEvent],
  );

  // Copy event
  const handleCopy = useCallback(() => {
    if (!enabled) return;
    const selected = window.getSelection()?.toString() || '';
    pushEvent('copy', { textLength: selected.length });
  }, [enabled, pushEvent]);

  // Tab/visibility change
  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    pushEvent('tab_switch', { hidden: document.hidden });
  }, [enabled, pushEvent]);

  // Public: track a compile event
  const trackCompile = useCallback(
    (language: string, codeLength: number, resultStatus: string) => {
      pushEvent('compile', { language, codeLength, resultStatus });
    },
    [pushEvent],
  );

  // Public: track language change
  const trackLanguageChange = useCallback(
    (from: string, to: string) => {
      pushEvent('language_change', { from, to });
    },
    [pushEvent],
  );

  useEffect(() => {
    if (!enabled) return;

    connectSocket(accessToken);

    document.addEventListener('keydown', handleKeystroke);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    flushIntervalRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    resetIdleTimer();

    return () => {
      document.removeEventListener('keydown', handleKeystroke);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      clearIdleTimer();
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current);
      flush(); // flush remaining events on unmount
    };
  }, [
    enabled,
    accessToken,
    handleKeystroke,
    handlePaste,
    handleCopy,
    handleVisibilityChange,
    flush,
    resetIdleTimer,
    clearIdleTimer,
  ]);

  return { trackCompile, trackLanguageChange };
}

function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
