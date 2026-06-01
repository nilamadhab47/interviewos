import crypto from 'crypto';
import { db } from '../db';
import { sessions, participants } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateSessionToken } from './auth.service';

function generateParticipantToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(input: {
  orgId: string;
  createdBy: string;
  creatorName: string;
  title?: string;
  questionId?: string;
  language?: string;
  allowAutocomplete?: boolean;
  allowPaste?: boolean;
  allowAi?: boolean;
  allowRunCode?: boolean;
  durationLimit?: number;
  candidateEmail?: string;
  candidateName?: string;
}) {
  // Create session
  const [session] = await db
    .insert(sessions)
    .values({
      orgId: input.orgId,
      createdBy: input.createdBy,
      title: input.title,
      questionId: input.questionId,
      language: input.language || 'javascript',
      allowAutocomplete: input.allowAutocomplete ?? true,
      allowPaste: input.allowPaste ?? true,
      allowAi: input.allowAi ?? false,
      allowRunCode: input.allowRunCode ?? true,
      durationLimit: input.durationLimit || 3600,
      livekitRoomName: `interview-${crypto.randomBytes(8).toString('hex')}`,
    })
    .returning();

  // Create interviewer participant
  const interviewerToken = generateParticipantToken();
  const [interviewer] = await db
    .insert(participants)
    .values({
      sessionId: session.id,
      userId: input.createdBy,
      name: input.creatorName,
      role: 'interviewer',
      token: interviewerToken,
    })
    .returning();

  // Create candidate participant (if email/name provided)
  let candidate = null;
  let candidateToken = null;
  if (input.candidateName || input.candidateEmail) {
    candidateToken = generateParticipantToken();
    [candidate] = await db
      .insert(participants)
      .values({
        sessionId: session.id,
        email: input.candidateEmail,
        name: input.candidateName || 'Candidate',
        role: 'candidate',
        token: candidateToken,
      })
      .returning();
  }

  return {
    session,
    interviewerToken,
    candidateToken,
    candidateJoinUrl: candidateToken
      ? `/join/${candidateToken}`
      : null,
  };
}

export async function listSessions(orgId: string, statusFilter?: string) {
  const conditions = [eq(sessions.orgId, orgId)];
  if (statusFilter) {
    conditions.push(eq(sessions.status, statusFilter));
  }

  const sessionList = await db
    .select()
    .from(sessions)
    .where(and(...conditions))
    .orderBy(desc(sessions.createdAt))
    .limit(50);

  // Fetch participants for each session
  const result = await Promise.all(
    sessionList.map(async (s) => {
      const sessionParticipants = await db
        .select()
        .from(participants)
        .where(eq(participants.sessionId, s.id));
      return { ...s, participants: sessionParticipants };
    }),
  );

  return result;
}

export async function getSession(sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (!session) return null;

  const sessionParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.sessionId, sessionId));

  return { ...session, participants: sessionParticipants };
}

export async function joinByToken(token: string) {
  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.token, token))
    .limit(1);

  if (!participant) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, participant.sessionId))
    .limit(1);

  if (!session) return null;

  // Mark joined
  if (!participant.joinedAt) {
    await db
      .update(participants)
      .set({ joinedAt: new Date() })
      .where(eq(participants.id, participant.id));
  }

  // Generate session-scoped JWT
  const sessionJwt = generateSessionToken({
    participantId: participant.id,
    sessionId: session.id,
    role: participant.role,
  });

  return {
    session: {
      id: session.id,
      title: session.title,
      status: session.status,
      language: session.language,
      questionId: session.questionId,
      permissions: {
        allowAutocomplete: session.allowAutocomplete,
        allowPaste: session.allowPaste,
        allowAi: session.allowAi,
        allowRunCode: session.allowRunCode,
      },
      durationLimit: session.durationLimit,
      livekitRoomName: session.livekitRoomName,
    },
    participant: {
      id: participant.id,
      name: participant.name,
      role: participant.role,
    },
    accessToken: sessionJwt,
  };
}

export async function updateSessionStatus(sessionId: string, status: string) {
  const now = new Date();
  const updates: Record<string, unknown> = { status, updatedAt: now };

  if (status === 'active') updates.startedAt = now;
  if (status === 'completed') updates.endedAt = now;

  const [updated] = await db
    .update(sessions)
    .set(updates)
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

export async function updateSessionPermissions(
  sessionId: string,
  permissions: Partial<{
    allowAutocomplete: boolean;
    allowPaste: boolean;
    allowAi: boolean;
    allowRunCode: boolean;
  }>,
) {
  const [updated] = await db
    .update(sessions)
    .set({ ...permissions, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}

export async function updateSessionQuestion(
  sessionId: string,
  questionId: string | null,
) {
  const [updated] = await db
    .update(sessions)
    .set({
      questionId: questionId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return updated;
}
