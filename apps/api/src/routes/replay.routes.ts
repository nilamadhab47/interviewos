import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getSnapshots } from '../services/snapshot.service';
import { getSession } from '../services/session.service';
import { db } from '../db';
import { telemetryEvents } from '../db/schema';
import { eq, asc } from 'drizzle-orm';

export const replayRouter = Router();

// GET /api/replay/:sessionId — get full replay data (snapshots + telemetry)
replayRouter.get('/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const snapshots = await getSnapshots(sessionId);

    const events = await db
      .select()
      .from(telemetryEvents)
      .where(eq(telemetryEvents.sessionId, sessionId))
      .orderBy(asc(telemetryEvents.createdAt));

    return res.json({
      session: {
        id: session.id,
        title: session.title,
        status: session.status,
        language: session.language,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        participants: session.participants,
      },
      snapshots: snapshots.map((s) => ({
        id: s.id,
        code: s.code,
        language: s.language,
        trigger: s.trigger,
        createdAt: s.createdAt,
      })),
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
    });
  } catch (err) {
    console.error('[Replay] Error:', err);
    return res.status(500).json({ error: 'Failed to load replay data' });
  }
});
