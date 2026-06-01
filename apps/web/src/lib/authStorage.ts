/** Persisted auth for account holders (JWT access + user profile). */
const USER_TOKEN_KEY = 'interviewos_access_token';
const USER_KEY = 'interviewos_user';
/** Set on login — used to know we should try the httpOnly refresh cookie after reload. */
const ACCOUNT_HINT_KEY = 'interviewos_account';

/** Persisted auth for interview join links (session-scoped JWT). */
const SESSION_TOKEN_KEY = 'interviewos_session_token';
const SESSION_USER_KEY = 'interviewos_session_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  role: string;
}

export interface StoredSessionUser {
  id: string;
  name: string;
  role: string;
}

export function saveUserAuth(accessToken: string, user: StoredUser): void {
  localStorage.setItem(USER_TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(ACCOUNT_HINT_KEY, '1');
  clearSessionAuth();
}

export function hasAccountHint(): boolean {
  return localStorage.getItem(ACCOUNT_HINT_KEY) === '1';
}

export function loadUserAuth(): { accessToken: string | null; user: StoredUser | null } {
  const accessToken = localStorage.getItem(USER_TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!accessToken || !raw) return { accessToken: null, user: null };
  try {
    return { accessToken, user: JSON.parse(raw) as StoredUser };
  } catch {
    return { accessToken: null, user: null };
  }
}

export function clearUserAuth(): void {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCOUNT_HINT_KEY);
}

export function saveSessionAuth(accessToken: string, user: StoredSessionUser): void {
  localStorage.setItem(SESSION_TOKEN_KEY, accessToken);
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
}

export function loadSessionAuth(): {
  accessToken: string | null;
  user: StoredSessionUser | null;
} {
  const accessToken = localStorage.getItem(SESSION_TOKEN_KEY);
  const raw = localStorage.getItem(SESSION_USER_KEY);
  if (!accessToken || !raw) return { accessToken: null, user: null };
  try {
    return { accessToken, user: JSON.parse(raw) as StoredSessionUser };
  } catch {
    return { accessToken: null, user: null };
  }
}

export function clearSessionAuth(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(SESSION_USER_KEY);
}

export function clearAllAuthStorage(): void {
  clearUserAuth();
  clearSessionAuth();
}
