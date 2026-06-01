import { db } from '../db';
import { codeSnapshots } from '../db/schema';
import { eq, and, asc, desc } from 'drizzle-orm';
import { getDocText } from '../yjs/server';

/**
 * Save a code snapshot for a session.
 * Called periodically (every 30s) for active sessions, and on compile/session-end.
 */
export async function saveSnapshot(input: {
  sessionId: string;
  participantId?: string;
  language: string;
  trigger: 'periodic' | 'compile' | 'end';
  /** When Yjs is not connected on the server yet, client can send editor text. */
  code?: string;
}) {
  const fromClient = input.code?.trim();
  const fromYjs = getDocText(input.sessionId);
  const code = fromClient || fromYjs;
  if (!code?.trim()) return null;

  const [snapshot] = await db
    .insert(codeSnapshots)
    .values({
      sessionId: input.sessionId,
      participantId: input.participantId ?? null,
      code,
      language: input.language,
      trigger: input.trigger,
    })
    .returning();

  return snapshot;
}

/**
 * Get all snapshots for a session, ordered by creation time.
 */
export async function getSnapshots(sessionId: string) {
  return db
    .select()
    .from(codeSnapshots)
    .where(eq(codeSnapshots.sessionId, sessionId))
    .orderBy(asc(codeSnapshots.createdAt));
}

/**
 * Get latest snapshot for a session.
 */
export async function getLatestSnapshot(sessionId: string) {
  const [snapshot] = await db
    .select()
    .from(codeSnapshots)
    .where(eq(codeSnapshots.sessionId, sessionId))
    .orderBy(desc(codeSnapshots.createdAt))
    .limit(1);

  return snapshot || null;
}
