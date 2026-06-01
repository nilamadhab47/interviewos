import * as Y from 'yjs';
import { resolveStarterCode } from '@interviewos/shared';
import { getLatestSnapshot } from './snapshot.service';
import { getSession } from './session.service';
import { getQuestion } from './question.service';

/**
 * Seed an empty Yjs room from the latest snapshot or the session's question starter code.
 * Runs when a room is first created (e.g. after refresh once the in-memory doc was destroyed).
 */
export async function hydrateYjsDocument(sessionId: string, doc: Y.Doc): Promise<void> {
  const ytext = doc.getText('monaco');
  if (ytext.length > 0) return;

  const latest = await getLatestSnapshot(sessionId);
  if (latest?.code?.trim()) {
    doc.transact(() => {
      ytext.insert(0, latest.code);
    });
    return;
  }

  const session = await getSession(sessionId);
  if (!session?.questionId) return;

  const question = await getQuestion(session.questionId);
  if (!question) return;

  const code = resolveStarterCode(question, session.language);
  if (!code.trim()) return;

  doc.transact(() => {
    ytext.insert(0, code);
  });
}
