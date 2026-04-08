import { db } from '../db';
import { telemetryEvents, sessions, participants } from '../db/schema';
import { eq, and, sql, count, sum } from 'drizzle-orm';
import type { TelemetryEvent, TelemetrySummary } from '@interviewos/shared';

export async function insertTelemetryBatch(events: TelemetryEvent[]): Promise<void> {
  if (events.length === 0) return;

  await db.insert(telemetryEvents).values(
    events.map((e) => ({
      sessionId: e.sessionId,
      participantId: e.participantId,
      eventType: e.eventType,
      payload: e.payload as Record<string, unknown>,
    })),
  );
}

export async function computeTelemetrySummary(
  sessionId: string,
  participantId: string,
): Promise<TelemetrySummary> {
  // Count specific event types
  const rows = await db
    .select({
      eventType: telemetryEvents.eventType,
      cnt: count(),
    })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.sessionId, sessionId),
        eq(telemetryEvents.participantId, participantId),
      ),
    )
    .groupBy(telemetryEvents.eventType);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.eventType] = Number(row.cnt);
  }

  // Compute WPM from recent keystroke bursts (last 3 bursts)
  const recentBursts = await db
    .select({ payload: telemetryEvents.payload })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.sessionId, sessionId),
        eq(telemetryEvents.participantId, participantId),
        eq(telemetryEvents.eventType, 'keystroke_burst'),
      ),
    )
    .orderBy(sql`${telemetryEvents.id} DESC`)
    .limit(3);

  let currentWpm = 0;
  let totalKeystrokes = 0;

  if (recentBursts.length > 0) {
    const wpms = recentBursts
      .map((b) => {
        const p = b.payload as Record<string, number>;
        totalKeystrokes += p.charCount || 0;
        return p.wpm || 0;
      });
    currentWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / wpms.length);
  }

  // Compute total keystrokes
  const allBursts = await db
    .select({ payload: telemetryEvents.payload })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.sessionId, sessionId),
        eq(telemetryEvents.participantId, participantId),
        eq(telemetryEvents.eventType, 'keystroke_burst'),
      ),
    );

  const allKeystrokes = allBursts.reduce((acc, b) => {
    const p = b.payload as Record<string, number>;
    return acc + (p.charCount || 0);
  }, 0);

  const isIdle = (counts['idle_start'] || 0) > (counts['idle_end'] || 0);

  return {
    totalKeystrokes: allKeystrokes,
    compileCount: counts['compile'] || 0,
    pasteCount: counts['paste'] || 0,
    tabSwitchCount: counts['tab_switch'] || 0,
    currentWpm,
    isIdle,
    idleDurationMs: 0, // simplified — full duration tracking is complex
  };
}
