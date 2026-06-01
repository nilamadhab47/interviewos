import { Router } from 'express';
import { createSessionSchema } from '@interviewos/shared';
import { requireAuth, requireSessionAuth, requireSessionAccess } from '../middleware/auth.middleware';
import { getQuestion } from '../services/question.service';
import {
  createSession,
  getSession,
  listSessions,
  joinByToken,
  updateSessionStatus,
  updateSessionPermissions,
  updateSessionQuestion,
} from '../services/session.service';
import { saveSnapshot } from '../services/snapshot.service';
import { broadcastSessionQuestion } from '../services/session-question-broadcast.service';
import { tryInjectQuestionStarter, resetEditorToStarter } from '../services/yjs-question.service';
import { flushYjsDocument } from '../yjs/server';

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

    if (result.session.questionId) {
      await tryInjectQuestionStarter(result.session.id);
      await broadcastSessionQuestion(result.session.id);
    }

    res.status(201).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create session';
    res.status(400).json({ error: message });
  }
});

// GET /api/sessions/:id/question — Attached coding question (interviewer or invite participant)
sessionRouter.get(
  '/:id/question',
  requireSessionAuth,
  requireSessionAccess(),
  async (req, res) => {
    try {
      const session = await getSession(req.params.id);
      if (!session?.questionId) {
        res.status(404).json({ error: 'No question attached' });
        return;
      }
      const question = await getQuestion(session.questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }
      res.json(question);
    } catch {
      res.status(500).json({ error: 'Failed to load question' });
    }
  },
);

// GET /api/sessions/:id — Get session details
sessionRouter.get('/:id', requireSessionAuth, requireSessionAccess(), async (req, res) => {
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

// PATCH /api/sessions/:id/question — Attach or change coding question
sessionRouter.patch('/:id/question', requireAuth, async (req, res) => {
  try {
    const { questionId } = req.body as { questionId?: string | null };
    if (questionId !== null && questionId !== undefined && typeof questionId !== 'string') {
      res.status(400).json({ error: 'Invalid questionId' });
      return;
    }
    const updated = await updateSessionQuestion(req.params.id, questionId ?? null);
    if (!updated) {
      res.status(404).json({ error: 'Interview not found' });
      return;
    }
    await tryInjectQuestionStarter(req.params.id);
    await broadcastSessionQuestion(req.params.id);
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// POST /api/sessions/:id/editor/reset-starter — Replace editor with question starter (interviewer)
sessionRouter.post('/:id/editor/reset-starter', requireAuth, async (req, res) => {
  try {
    const ok = await resetEditorToStarter(req.params.id);
    if (!ok) {
      res.status(400).json({ error: 'No question attached or starter code unavailable' });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to reset editor' });
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

// POST /api/sessions/:id/snapshot — Persist current editor content from Yjs
sessionRouter.post('/:id/snapshot', requireAuth, async (req, res) => {
  try {
    const { language, code } = req.body as { language?: string; code?: string };
    const snapshot = await saveSnapshot({
      sessionId: req.params.id,
      language: language || 'javascript',
      trigger: 'periodic',
      code,
    });
    if (!snapshot) {
      res.status(204).end();
      return;
    }
    res.json(snapshot);
  } catch {
    res.status(500).json({ error: 'Failed to save snapshot' });
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
    const session = await getSession(req.params.id);
    await flushYjsDocument(req.params.id, session?.language);
    const updated = await updateSessionStatus(req.params.id, 'completed');
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Failed to end session' });
  }
});
