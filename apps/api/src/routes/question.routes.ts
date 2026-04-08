import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
  deleteQuestion,
} from '../services/question.service';

export const questionRouter = Router();

// GET /api/questions — list questions for user's org + public
questionRouter.get('/', requireAuth, async (req, res) => {
  try {
    const orgId = (req as any).user?.orgId;
    if (!orgId) {
      return res.status(400).json({ error: 'User has no organization' });
    }
    const list = await getQuestions(orgId);
    return res.json(list);
  } catch (err) {
    console.error('[Questions] List error:', err);
    return res.status(500).json({ error: 'Failed to list questions' });
  }
});

// GET /api/questions/:id — get single question
questionRouter.get('/:id', requireAuth, async (req, res) => {
  try {
    const question = await getQuestion(req.params.id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json(question);
  } catch (err) {
    console.error('[Questions] Get error:', err);
    return res.status(500).json({ error: 'Failed to get question' });
  }
});

// POST /api/questions — create question
questionRouter.post('/', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { title, description, difficulty, defaultCode, testCases, tags, isPublic } = req.body;

    if (!title || !description || !difficulty) {
      return res.status(400).json({ error: 'title, description, and difficulty are required' });
    }

    const question = await createQuestion({
      orgId: user.orgId,
      createdBy: user.id,
      title,
      description,
      difficulty,
      defaultCode,
      testCases,
      tags,
      isPublic,
    });

    return res.status(201).json(question);
  } catch (err) {
    console.error('[Questions] Create error:', err);
    return res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /api/questions/:id — update question
questionRouter.put('/:id', requireAuth, async (req, res) => {
  try {
    const updated = await updateQuestion(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json(updated);
  } catch (err) {
    console.error('[Questions] Update error:', err);
    return res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/questions/:id — delete question
questionRouter.delete('/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await deleteQuestion(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Question not found' });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('[Questions] Delete error:', err);
    return res.status(500).json({ error: 'Failed to delete question' });
  }
});
