export type UserRole = 'admin' | 'member';
export type ParticipantRole = 'interviewer' | 'candidate' | 'observer';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  orgId: string;
  role: UserRole;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface Participant {
  id: string;
  sessionId: string;
  userId?: string;
  email?: string;
  name: string;
  role: ParticipantRole;
  token: string;
  joinedAt?: string;
  leftAt?: string;
}
