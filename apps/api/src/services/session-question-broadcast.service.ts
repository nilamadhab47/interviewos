import type { SessionQuestionPayload } from '@interviewos/shared';
import { emitToSession } from '../socket/emit';
import { getSession } from './session.service';
import { getQuestion } from './question.service';

function toPayloadQuestion(
  question: NonNullable<Awaited<ReturnType<typeof getQuestion>>>,
): NonNullable<SessionQuestionPayload['question']> {
  return {
    id: question.id,
    title: question.title,
    description: question.description,
    difficulty: question.difficulty,
    defaultCode: (question.defaultCode as Record<string, string>) || {},
    testCases: (question.testCases as Array<{ input: string; expected: string }>) || [],
    tags: question.tags || [],
    isPublic: question.isPublic,
  };
}

export async function broadcastSessionQuestion(sessionId: string): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) return;

  let questionPayload: SessionQuestionPayload['question'] = null;

  if (session.questionId) {
    const question = await getQuestion(session.questionId);
    if (question) {
      questionPayload = toPayloadQuestion(question);
    }
  }

  const data: SessionQuestionPayload = {
    questionId: session.questionId ?? null,
    question: questionPayload,
    language: session.language,
  };

  emitToSession(sessionId, 'session:question_changed', data);
}
