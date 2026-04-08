import { Router } from 'express';
import { createSessionSchema } from '@interviewos/shared';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createSession,
  getSession,
  listSessions,
  joinByToken,
  updateSessionStatus,
  updateSessionPermissions,
} from '../services/session.service';

export const sessionRouter = Router();

// GET /api/sessions — List sessions for user's org
sessionRouter.get('/', requireAuth, async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const list = await listSessions(req.user!.orgId, status);
    res.json(list);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// POST /api/sessions — Create interview session
sessionRouter.post('/', requireAuth, async (req, res) => {
  try {
    const input = createSessionSchema.parse(req.body);
    const result = await createSession({
      orgId: req.user!.orgId,
      createdBy: req.user!.userId,
      creatorName: req.user!.email,
      ...input,
    });

    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    res.status(400).json({ error: message });
  }
});

// GET /api/sessions/:id — Get session details
sessionRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const session = await getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(session);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

// GET /api/sessions/join/:token — Join via invite token (no auth required)
sessionRouter.get('/join/:token', async (req, res) => {
  try {
    const result = await joinByToken(req.params.token);
    if (!result) {
      res.status(404).json({ error: 'Invalid or expired invite link' });
      return;
    }
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to join session' });
  }
});

// PATCH /api/sessions/:id/permissions — Update session permissions
sessionRouter.patch('/:id/permissions', requireAuth, async (req, res) => {
  try {
    const updated = await updateSessionPermissions(req.params.id, req.body);
    if (!updated) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// POST /api/sessions/:id/start — Start interview
sessionRouter.post('/:id/start', requireAuth, async (req, res) => {
  try {
    const updated = await updateSessionStatus(req.params.id, 'active');
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /api/sessions/:id/end — End interview
sessionRouter.post('/:id/end', requireAuth, async (req, res) => {
  try {
    const updated = await updateSessionStatus(req.params.id, 'completed');
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});
