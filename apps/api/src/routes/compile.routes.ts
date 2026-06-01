import { Router } from 'express';
import { compileRequestSchema } from '@interviewos/shared';
import { requireSessionAuth } from '../middleware/auth.middleware';
import { compileCode } from '../services/compile.service';
import { db } from '../db';
import { compilationResults } from '../db/schema';

export const compileRouter = Router();

// POST /api/compile — Execute code via self-hosted Judge0
compileRouter.post('/', requireSessionAuth, async (req, res) => {
  try {
    const input = compileRequestSchema.parse(req.body);

    const result = await compileCode({
      code: input.code,
      languageId: input.languageId,
      stdin: input.stdin,
    });

    // Store result for audit trail (non-blocking — don't fail the run if logging fails)
    const participantId = req.sessionParticipant?.participantId || null;
    try {
      await db.insert(compilationResults).values({
        sessionId: input.sessionId,
        participantId: participantId ?? undefined,
        language: String(input.languageId),
        code: input.code,
        stdin: input.stdin,
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status,
        exitCode: result.exitCode,
        timeMs: result.timeMs,
        memoryKb: result.memoryKb,
      });
    } catch (logErr) {
      console.error('[Compile] Failed to log result:', logErr);
    }

    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Compilation failed';
    res.status(500).json({ error: message });
  }
});
