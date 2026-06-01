export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Account-holder JWT (dashboard login), not invite-link session JWT. */
export function isUserAccessToken(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  return payload.type !== 'session';
}

export function isTokenExpired(token: string, skewMs = 10_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 < Date.now() + skewMs;
}
