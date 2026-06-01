import { getLanguageById } from '../constants/languages';

export interface QuestionStarterSource {
  defaultCode?: Record<string, string> | null;
}

/** Resolve editor starter code from a question + session language. */
export function resolveStarterCode(
  question: QuestionStarterSource | null | undefined,
  languageId: string,
): string {
  const langDefault = getLanguageById(languageId)?.defaultCode ?? '';

  if (!question?.defaultCode) {
    return langDefault;
  }

  const fromQuestion = question.defaultCode[languageId];
  if (typeof fromQuestion === 'string' && fromQuestion.trim()) {
    return fromQuestion;
  }

  const anyEntry = Object.values(question.defaultCode).find(
    (v) => typeof v === 'string' && v.trim(),
  );
  return anyEntry ?? langDefault;
}
