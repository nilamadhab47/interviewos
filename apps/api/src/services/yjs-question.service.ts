import * as Y from 'yjs';
import { resolveStarterCode, type QuestionStarterSource } from '@interviewos/shared';
import { getSession } from './session.service';
import { getQuestion } from './question.service';
import {
  getYjsDocument,
  isDocPristine,
  saveYjsDocument,
  isYjsDocumentInitialized,
  getMonacoText,
} from './yjs-doc.service';
import { injectStarterIfPristine } from './yjs-hydrate.service';
import { getLiveRoomDoc, flushYjsDocument } from '../yjs/server';

/**
 * When a question is attached, inject starter only if the doc is still pristine.
 * Safe to call when no clients are connected (next room create will hydrate from DB).
 */
export async function tryInjectQuestionStarter(sessionId: string): Promise<boolean> {
  const liveDoc = getLiveRoomDoc(sessionId);
  if (liveDoc) {
    return injectStarterIfPristine(sessionId, liveDoc);
  }

  const stored = await getYjsDocument(sessionId);
  if (stored?.state.byteLength && !isDocPristineFromState(stored.state)) {
    return false;
  }

  if (await isYjsDocumentInitialized(sessionId)) {
    return false;
  }

  const session = await getSession(sessionId);
  if (!session?.questionId) return false;

  const question = await getQuestion(session.questionId);
  if (!question) return false;

  const code = resolveStarterCode(question as QuestionStarterSource, session.language);
  if (!code.trim()) return false;

  const doc = new Y.Doc();
  if (stored?.state.byteLength) {
    Y.applyUpdate(doc, stored.state);
  }
  if (!isDocPristine(doc)) return false;

  doc.transact(() => {
    doc.getText('monaco').insert(0, code);
  });
  await saveYjsDocument(sessionId, doc, session.language, { markInitialized: true });
  return true;
}

function isDocPristineFromState(state: Uint8Array): boolean {
  const doc = new Y.Doc();
  Y.applyUpdate(doc, state);
  return isDocPristine(doc);
}

/**
 * Interviewer action: replace editor content with question starter (explicit reset).
 */
export async function resetEditorToStarter(sessionId: string): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session?.questionId) return false;

  const question = await getQuestion(session.questionId);
  if (!question) return false;

  const code = resolveStarterCode(question as QuestionStarterSource, session.language);
  if (!code.trim()) return false;

  const liveDoc = getLiveRoomDoc(sessionId);
  if (liveDoc) {
    liveDoc.transact(() => {
      const ytext = liveDoc.getText('monaco');
      if (ytext.length > 0) ytext.delete(0, ytext.length);
      ytext.insert(0, code);
    });
    await flushYjsDocument(sessionId, session.language);
    return true;
  }

  const doc = new Y.Doc();
  const stored = await getYjsDocument(sessionId);
  if (stored?.state.byteLength) {
    Y.applyUpdate(doc, stored.state);
  }
  doc.transact(() => {
    const ytext = doc.getText('monaco');
    if (ytext.length > 0) ytext.delete(0, ytext.length);
    ytext.insert(0, code);
  });
  await saveYjsDocument(sessionId, doc, session.language, { markInitialized: true });
  return true;
}

/** Read current code for replay / audit (live room, then DB). */
export async function getEditorCodeForSession(sessionId: string): Promise<string> {
  const live = getLiveRoomDoc(sessionId);
  if (live) {
    const text = getMonacoText(live);
    if (text.trim()) return text;
  }

  const stored = await getYjsDocument(sessionId);
  if (stored?.state.byteLength) {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, stored.state);
    const text = getMonacoText(doc);
    if (text.trim()) return text;
  }

  return '';
}
