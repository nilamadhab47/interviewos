import { create } from 'zustand';
import { api } from '@/lib/api';
import { normalizeSession } from '@/lib/sessionApi';
import type { Session, Participant } from '@interviewos/shared';

interface SessionState {
  session: (Session & { participants: Participant[] }) | null;
  isLoading: boolean;
  error: string | null;

  createSession: (
    input: {
      title?: string;
      language?: string;
      questionId?: string;
      candidateName?: string;
      candidateEmail?: string;
    },
    token: string,
  ) => Promise<{
    session: Session;
    interviewerToken: string;
    candidateToken: string | null;
    candidateJoinUrl: string | null;
  }>;

  fetchSession: (id: string, token: string) => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: false,
  error: null,

  createSession: async (input, token) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api<{
        session: Session;
        interviewerToken: string;
        candidateToken: string | null;
        candidateJoinUrl: string | null;
      }>('/api/sessions', {
        method: 'POST',
        body: input,
        token,
      });
      set({ isLoading: false });
      return data;
    } catch (err) {
      set({ error: 'Failed to schedule interview', isLoading: false });
      throw err;
    }
  },

  fetchSession: async (id, token) => {
    set({ isLoading: true, error: null, session: null });
    try {
      const data = await api<Session & { participants: Participant[] }>(
        `/api/sessions/${id}`,
        { token },
      );
      set({ session: normalizeSession(data), isLoading: false });
    } catch {
      set({ error: 'Failed to load session', isLoading: false, session: null });
    }
  },

  clearSession: () => set({ session: null }),
}));
