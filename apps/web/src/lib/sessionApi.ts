import type { Session, SessionPermissions, Participant } from '@interviewos/shared';
import type { Question } from '@/types/question';
import { api } from '@/lib/api';

type RawSession = Session & {
  participants: Participant[];
  allowAutocomplete?: boolean;
  allowPaste?: boolean;
  allowAi?: boolean;
  allowRunCode?: boolean;
  permissions?: SessionPermissions;
};

export function normalizeSession(raw: RawSession): Session & { participants: Participant[] } {
  const permissions: SessionPermissions = raw.permissions ?? {
    allowAutocomplete: raw.allowAutocomplete ?? true,
    allowPaste: raw.allowPaste ?? true,
    allowAi: raw.allowAi ?? false,
    allowRunCode: raw.allowRunCode ?? true,
  };

  return {
    ...raw,
    permissions,
  };
}

export async function fetchSessionQuestion(
  sessionId: string,
  token: string,
): Promise<Question | null> {
  try {
    return await api<Question>(`/api/sessions/${sessionId}/question`, { token });
  } catch {
    return null;
  }
}
