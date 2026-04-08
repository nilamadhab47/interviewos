import { create } from 'zustand';
import { api, ApiError } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;

  register: (input: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }) => Promise<void>;

  login: (input: { email: string; password: string }) => Promise<void>;

  logout: () => Promise<void>;

  refreshToken: () => Promise<void>;

  setSessionAuth: (token: string, participant: { id: string; name: string; role: string }, sessionId: string) => void;

  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isLoading: false,
  error: null,

  register: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api<{ user: User; accessToken: string }>(
        '/api/auth/register',
        { method: 'POST', body: input },
      );
      set({ user: data.user, accessToken: data.accessToken, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api<{ user: User; accessToken: string }>(
        '/api/auth/login',
        { method: 'POST', body: input },
      );
      set({ user: data.user, accessToken: data.accessToken, isLoading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    }
    set({ user: null, accessToken: null });
  },

  refreshToken: async () => {
    try {
      const data = await api<{ user: User; accessToken: string }>(
        '/api/auth/refresh',
        { method: 'POST' },
      );
      set({ user: data.user, accessToken: data.accessToken });
    } catch {
      set({ user: null, accessToken: null });
    }
  },

  setSessionAuth: (token, participant, sessionId) => {
    set({
      accessToken: token,
      user: { id: participant.id, email: '', name: participant.name, orgId: '', role: participant.role },
    });
  },

  clearError: () => set({ error: null }),
}));
