const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
  /** Skip automatic refresh on 401 (used by refresh endpoint itself). */
  skipAuthRetry?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let tokenGetter: () => string | null = () => null;
let refreshHandler: (() => Promise<boolean>) | null = null;

export function setAuthTokenGetter(getter: () => string | null): void {
  tokenGetter = getter;
}

export function setAuthRefreshHandler(handler: () => Promise<boolean>): void {
  refreshHandler = handler;
}

/** Refresh access token via httpOnly cookie — returns null on 401 (no throw). */
export async function tryRefreshSession(): Promise<{
  user: {
    id: string;
    email: string;
    name: string;
    orgId: string;
    role: string;
  };
  accessToken: string;
} | null> {
  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    return null;
  }

  return res.json() as Promise<{
    user: {
      id: string;
      email: string;
      name: string;
      orgId: string;
      role: string;
    };
    accessToken: string;
  }>;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, skipAuthRetry = false } = options;
  const token = options.token ?? tokenGetter() ?? undefined;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const doFetch = (authToken?: string) => {
    const h = { ...headers };
    if (authToken) {
      h['Authorization'] = `Bearer ${authToken}`;
    }
    return fetch(`${API_URL}${path}`, {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    });
  };

  let res = await doFetch(token);

  if (
    res.status === 401 &&
    !skipAuthRetry &&
    refreshHandler &&
    !options.token &&
    path !== '/api/auth/refresh'
  ) {
    const ok = await refreshHandler();
    if (ok) {
      const newToken = tokenGetter();
      if (newToken) {
        res = await doFetch(newToken);
      }
    }
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error || 'Request failed');
  }

  return data as T;
}
