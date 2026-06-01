import { resolveStarterCode, getLanguageById } from '@interviewos/shared';
import { getLatestSnapshot } from './snapshot.service';
import { getSession } from './session.service';
import { getQuestion } from './question.service';
import { getDocText } from '../yjs/server';

export async function getEditorBootstrap(sessionId: string) {
  const live = getDocText(sessionId);
  if (live?.trim()) {
    return { code: live, source: 'live' as const };
  }

  const snapshot = await getLatestSnapshot(sessionId);
  if (snapshot?.code?.trim()) {
    return { code: snapshot.code, source: 'snapshot' as const };
  }

  const session = await getSession(sessionId);
  if (!session) {
    return { code: getLanguageById('javascript')?.defaultCode ?? '', source: 'template' as const };
  }

  if (session.questionId) {
    const question = await getQuestion(session.questionId);
    if (question) {
      const code = resolveStarterCode(question, session.language);
      if (code.trim()) {
        return { code, source: 'question' as const };
      }
    }
  }

  return {
    code: getLanguageById(session.language)?.defaultCode ?? '',
    source: 'template' as const,
  };
}
