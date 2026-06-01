import * as Y from 'yjs';
import { resolveStarterCode, type QuestionStarterSource } from '@interviewos/shared';
import { getSession } from './session.service';
import { getQuestion } from './question.service';
import {
  getYjsDocument,
  isDocPristine,
  saveYjsDocument,
  isYjsDocumentInitialized,
} from './yjs-doc.service';

/**
 * One-time server-side starter injection when the collaborative doc is still empty.
 * Returns true if starter code was written.
 */
export async function injectStarterIfPristine(
  sessionId: string,
  doc: Y.Doc,
): Promise<boolean> {
  if (!isDocPristine(doc)) return false;

  const alreadyInitialized = await isYjsDocumentInitialized(sessionId);
  if (alreadyInitialized) return false;

  const session = await getSession(sessionId);
  if (!session?.questionId) return false;

  const question = await getQuestion(session.questionId);
  if (!question) return false;

  const code = resolveStarterCode(question as QuestionStarterSource, session.language);
  if (!code.trim()) return false;

  doc.transact(() => {
    doc.getText('monaco').insert(0, code);
  });

  await saveYjsDocument(sessionId, doc, session.language, { markInitialized: true });
  return true;
}

/**
 * Load persisted CRDT state, then inject starter only when doc is empty and never initialized.
 */
export async function hydrateYjsDocument(sessionId: string, doc: Y.Doc): Promise<void> {
  const stored = await getYjsDocument(sessionId);
  if (stored?.state.byteLength) {
    Y.applyUpdate(doc, stored.state);
    if (!isDocPristine(doc)) return;
  }

  await injectStarterIfPristine(sessionId, doc);
}
