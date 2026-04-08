import { useEffect, useCallback, useRef } from 'react';
import type { SessionPermissions } from '@interviewos/shared';

interface AntiCheatFlags {
  largePastes: number;   // pastes > 50 chars
  tabSwitches: number;
  wpmSpikes: number;     // WPM > 200 (suggests external paste)
}

interface UseAntiCheatOptions {
  permissions: SessionPermissions;
  onFlag?: (type: keyof AntiCheatFlags, detail: string) => void;
}

/**
 * useAntiCheat
 * - Blocks paste into the editor when allowPaste=false
 * - Tracks flag counts (large pastes, tab switches, WPM spikes)
 * - Does NOT send to server — that's handled by useTelemetry
 */
export function useAntiCheat({ permissions, onFlag }: UseAntiCheatOptions) {
  const flagsRef = useRef<AntiCheatFlags>({
    largePastes: 0,
    tabSwitches: 0,
    wpmSpikes: 0,
  });

  // Block paste when permission is off
  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!permissions.allowPaste) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Flag large pastes even when allowed
      const text = e.clipboardData?.getData('text') || '';
      if (text.length > 50) {
        flagsRef.current.largePastes += 1;
        onFlag?.('largePastes', `Pasted ${text.length} chars`);
      }
    },
    [permissions.allowPaste, onFlag],
  );

  // Track tab switches
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      flagsRef.current.tabSwitches += 1;
      onFlag?.('tabSwitches', 'Tab switched away');
    }
  }, [onFlag]);

  // Detect WPM spikes (signal from useTelemetry via custom event)
  const handleWpmSpike = useCallback(
    (e: CustomEvent<{ wpm: number }>) => {
      if (e.detail.wpm > 200) {
        flagsRef.current.wpmSpikes += 1;
        onFlag?.('wpmSpikes', `WPM spike: ${e.detail.wpm}`);
      }
    },
    [onFlag],
  );

  useEffect(() => {
    // Use capture phase so we intercept before Monaco handles it
    document.addEventListener('paste', handlePaste, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('wpm-spike', handleWpmSpike as EventListener);

    return () => {
      document.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('wpm-spike', handleWpmSpike as EventListener);
    };
  }, [handlePaste, handleVisibilityChange, handleWpmSpike]);

  const getFlags = useCallback((): AntiCheatFlags => ({ ...flagsRef.current }), []);

  return { getFlags };
}
