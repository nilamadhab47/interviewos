import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@interviewos/shared';
import { authRouter } from './routes/auth.routes';
import { sessionRouter } from './routes/session.routes';
import { compileRouter } from './routes/compile.routes';
import { livekitRouter } from './routes/livekit.routes';
import { questionRouter } from './routes/question.routes';
import { replayRouter } from './routes/replay.routes';
import { setupYjsServer } from './yjs/server';
import { insertTelemetryBatch, computeTelemetrySummary } from './services/telemetry.service';
import { saveSnapshot } from './services/snapshot.service';

const app = express();
const httpServer = createServer(app);

// IMPORTANT: Set up Yjs WebSocket server FIRST (before Socket.IO attaches its upgrade handler)
// This registers a manual upgrade handler for /yjs paths
setupYjsServer(httpServer);

// Now set up Socket.IO — it will also register an upgrade handler, but Yjs already grabbed /yjs
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/sessions', sessionRouter);
app.use('/api/compile', compileRouter);
app.use('/api/livekit', livekitRouter);
app.use('/api/questions', questionRouter);
app.use('/api/replay', replayRouter);

// Track which socket is the interviewer per session
const interviewerSockets = new Map<string, string>();

// Per-session: Map<sessionId, Map<participantId, lastTelemetryTime>>
const sessionParticipants = new Map<string, Map<string, string>>();

// Track session language for snapshots
const sessionLanguages = new Map<string, string>();

// Telemetry summary push — every 5s for each active session
setInterval(async () => {
  for (const [sessionId, participants] of sessionParticipants.entries()) {
    const interviewerSocketId = interviewerSockets.get(sessionId);
    if (!interviewerSocketId) continue;

    for (const [participantId] of participants.entries()) {
      try {
        const summary = await computeTelemetrySummary(sessionId, participantId);
        io.to(interviewerSocketId).emit('telemetry:summary', summary);
      } catch (err) {
        console.error('[Telemetry] Summary error:', err);
      }
    }
  }
}, 5000);

// Periodic code snapshots — every 30s for active sessions
setInterval(async () => {
  for (const [sessionId] of sessionParticipants.entries()) {
    try {
      await saveSnapshot({
        sessionId,
        language: sessionLanguages.get(sessionId) || 'javascript',
        trigger: 'periodic',
      });
    } catch (err) {
      console.error('[Snapshot] Save error:', err);
    }
  }
}, 30000);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  let currentSessionId: string | null = null;
  let participantRole: string | null = null;
  let participantId: string | null = null;

  socket.on('session:join', ({ sessionId, token }) => {
    currentSessionId = sessionId;
    socket.join(sessionId);
    console.log(`[Socket] ${socket.id} joined session ${sessionId}`);

    // Decode role from token (simple JWT decode — no verify needed here, REST auth handles security)
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      participantRole = payload.role || null;
      participantId = payload.participantId || null;

      if (participantRole === 'interviewer') {
        interviewerSockets.set(sessionId, socket.id);
      } else if (participantId) {
        if (!sessionParticipants.has(sessionId)) {
          sessionParticipants.set(sessionId, new Map());
        }
        sessionParticipants.get(sessionId)!.set(participantId, new Date().toISOString());
      }
    } catch {
      // ignore token decode errors
    }
  });

  socket.on('session:leave', ({ sessionId }) => {
    socket.leave(sessionId);
    if (participantId && sessionParticipants.has(sessionId)) {
      sessionParticipants.get(sessionId)!.delete(participantId);
    }
    console.log(`[Socket] ${socket.id} left session ${sessionId}`);
  });

  socket.on('telemetry:batch', async ({ sessionId, events }) => {
    if (!events || events.length === 0) return;
    try {
      await insertTelemetryBatch(events);
      console.log(`[Telemetry] Saved ${events.length} events for session ${sessionId}`);
    } catch (err) {
      console.error('[Telemetry] Insert error:', err);
    }
  });

  socket.on('compile:request', async ({ sessionId, code, languageId, stdin }) => {
    io.to(sessionId).emit('compile:status', { isCompiling: true });
    console.log(`[Compile] Request from ${socket.id} in session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    if (currentSessionId) {
      if (interviewerSockets.get(currentSessionId) === socket.id) {
        interviewerSockets.delete(currentSessionId);
      }
      if (participantId && sessionParticipants.has(currentSessionId)) {
        sessionParticipants.get(currentSessionId)!.delete(participantId);
      }
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '8000', 10);
httpServer.listen(PORT, () => {
  console.log(`
  ┌─────────────────────────────────────┐
  │                                     │
  │   InterviewOS API Server            │
  │   Running on http://localhost:${PORT}  │
  │                                     │
  └─────────────────────────────────────┘
  `);
});

export { io };
