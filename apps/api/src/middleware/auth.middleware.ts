import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, verifySessionToken, type TokenPayload, type SessionTokenPayload } from '../services/auth.service';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      sessionParticipant?: SessionTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireSessionAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    // Try session token first, then regular auth token
    try {
      req.sessionParticipant = verifySessionToken(token);
    } catch {
      req.user = verifyAccessToken(token);
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
