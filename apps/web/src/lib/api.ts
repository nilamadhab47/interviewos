const API_URL = import.meta.env.VITE_API_URL || '';

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
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

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { method = 'GET', body, token } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include', // for httpOnly cookies (refresh token)
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Request failed');
  }

  return data as T;
}
