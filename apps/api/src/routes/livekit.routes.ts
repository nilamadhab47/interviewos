import { Router } from 'express';
import { requireSessionAuth } from '../middleware/auth.middleware';
import { generateLiveKitToken } from '../services/livekit.service';
import { getSession } from '../services/session.service';

export const livekitRouter = Router();

// POST /api/livekit/token — generate a LiveKit room token for authenticated user or session participant
livekitRouter.post('/token', requireSessionAuth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Find participant — match by userId (interviewer) or participantId (candidate with session token)
    let participant = null;
    if (req.sessionParticipant?.participantId) {
      participant = session.participants.find(
        (p) => p.id === req.sessionParticipant!.participantId,
      );
    }
    if (!participant && req.user?.userId) {
      participant = session.participants.find(
        (p) => p.userId === req.user!.userId,
      );
    }

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant of this session' });
    }

    const roomName = session.livekitRoomName || `interview-${sessionId}`;

    const token = await generateLiveKitToken({
      roomName,
      participantIdentity: participant.id,
      participantName: participant.name,
      role: participant.role,
    });

    return res.json({
      token,
      url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
      roomName,
    });
  } catch (err) {
    console.error('[LiveKit] Token error:', err);
    return res.status(500).json({ error: 'Failed to generate token' });
  }
});
