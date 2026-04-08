import { Router } from 'express';
import { registerSchema, loginSchema } from '@interviewos/shared';
import { registerUser, loginUser, refreshAccessToken } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';

export const authRouter = Router();

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};

// POST /api/auth/register
authRouter.post('/register', async (req, res) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await registerUser(input);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.status(201).json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    const status = message === 'Email already registered' ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await loginUser(input);

    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req, res) => {
  try {
    const oldRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
    if (!oldRefreshToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const result = await refreshAccessToken(oldRefreshToken);
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);
    res.json({
      user: result.user,
      accessToken: result.accessToken,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token refresh failed';
    res.status(401).json({ error: message });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (_req, res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me — Get current user
authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
