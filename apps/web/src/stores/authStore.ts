import { create } from 'zustand';
import { api, ApiError, setAuthTokenGetter, tryRefreshSession } from '@/lib/api';
import { isTokenExpired } from '@/lib/jwt';
import {
  saveUserAuth,
  loadUserAuth,
  clearUserAuth,
  saveSessionAuth,
  loadSessionAuth,
  clearAllAuthStorage,
  hasAccountHint,
  type StoredUser,
} from '@/lib/authStorage';

export type AuthMode = 'user' | 'session' | null;

export interface User {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  authMode: AuthMode;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  initializeAuth: () => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setSessionAuth: (
    token: string,
    participant: { id: string; name: string; role: string },
    sessionId: string,
  ) => void;
  clearError: () => void;
  isUserAuthenticated: () => boolean;
  isInterviewAuthenticated: () => boolean;
}

function toUser(u: StoredUser): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    orgId: u.orgId ?? '',
    role: u.role,
  };
}

function sessionUserToUser(participant: { id: string; name: string; role: string }): User {
  return {
    id: participant.id,
    email: '',
    name: participant.name,
    orgId: '',
    role: participant.role,
  };
}

function applyUserAuth(
  set: (partial: Partial<AuthState>) => void,
  accessToken: string,
  user: User,
) {
  saveUserAuth(accessToken, {
    id: user.id,
    email: user.email,
    name: user.name,
    orgId: user.orgId,
    role: user.role,
  });
  set({
    user,
    accessToken,
    authMode: 'user',
    error: null,
  });
}

let authInitPromise: Promise<void> | null = null;

export const useAuthStore = create<AuthState>((set, get) => {
  setAuthTokenGetter(() => get().accessToken);

  return {
    user: null,
    accessToken: null,
    authMode: null,
    isLoading: false,
    isInitialized: false,
    error: null,

    isUserAuthenticated: () => {
      const { authMode, accessToken, user } = get();
      return authMode === 'user' && Boolean(accessToken && user?.email);
    },

    isInterviewAuthenticated: () => {
      const { accessToken, user } = get();
      return Boolean(accessToken && user);
    },

    initializeAuth: async () => {
      if (get().isInitialized) return;
      if (authInitPromise) return authInitPromise;

      authInitPromise = (async () => {
        set({ isLoading: true });

        // 1. Interview invite session (candidate) — never call /api/auth/me or /refresh
        const sessionStored = loadSessionAuth();
        if (sessionStored.accessToken && sessionStored.user) {
          set({
            accessToken: sessionStored.accessToken,
            user: sessionUserToUser(sessionStored.user),
            authMode: 'session',
            error: null,
            isInitialized: true,
            isLoading: false,
          });
          return;
        }

        const stored = loadUserAuth();

        // 2. Account holder — validate token or refresh cookie
        if (stored.accessToken && stored.user && !isTokenExpired(stored.accessToken)) {
          try {
            const { user } = await api<{ user: User }>('/api/auth/me', {
              token: stored.accessToken,
              skipAuthRetry: true,
            });
            applyUserAuth(set, stored.accessToken, user);
            set({ isInitialized: true, isLoading: false });
            return;
          } catch {
            // fall through to refresh
          }
        }

        if (hasAccountHint()) {
          const refreshed = await tryRefreshSession();
          if (refreshed) {
            applyUserAuth(set, refreshed.accessToken, refreshed.user);
            set({ isInitialized: true, isLoading: false });
            return;
          }
          clearUserAuth();
        } else if (stored.accessToken) {
          clearUserAuth();
        }

        set({
          user: null,
          accessToken: null,
          authMode: null,
          isInitialized: true,
          isLoading: false,
        });
      })();

      try {
        await authInitPromise;
      } finally {
        authInitPromise = null;
      }
    },

    register: async (input) => {
      set({ isLoading: true, error: null });
      try {
        const data = await api<{ user: User; accessToken: string }>(
          '/api/auth/register',
          { method: 'POST', body: input },
        );
        applyUserAuth(set, data.accessToken, data.user);
        set({ isLoading: false });
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
        applyUserAuth(set, data.accessToken, data.user);
        set({ isLoading: false });
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Login failed';
        set({ error: message, isLoading: false });
        throw err;
      }
    },

    logout: async () => {
      set({ isLoading: true });
      try {
        if (get().authMode === 'user') {
          await api('/api/auth/logout', { method: 'POST' });
        }
      } catch {
        // ignore
      }
      clearAllAuthStorage();
      set({
        user: null,
        accessToken: null,
        authMode: null,
        isLoading: false,
        error: null,
      });
    },

    refreshToken: async () => {
      const data = await tryRefreshSession();
      if (!data) {
        return false;
      }
      applyUserAuth(set, data.accessToken, data.user);
      return true;
    },

    setSessionAuth: (token, participant, _sessionId) => {
      clearUserAuth();
      saveSessionAuth(token, {
        id: participant.id,
        name: participant.name,
        role: participant.role,
      });
      set({
        accessToken: token,
        user: sessionUserToUser(participant),
        authMode: 'session',
        error: null,
        isInitialized: true,
        isLoading: false,
      });
    },

    clearError: () => set({ error: null }),
  };
});
