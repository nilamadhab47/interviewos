# InterviewOS

A real-time collaborative coding interview platform. Interviewers can create sessions, invite candidates via link, watch them code live with synchronized editors, conduct video calls, execute code, and review full session replays with telemetry.

> **Note:** This project evolved from a simple multiplayer code editor (the old `client/` + `server/` directories have been removed). The new codebase lives entirely in the `apps/` and `packages/` monorepo structure.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         pnpm monorepo                            │
│                                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐    │
│  │ apps/web    │   │ apps/api     │   │ packages/shared    │    │
│  │ React SPA   │──▶│ Express API  │◀──│ Types, Zod schemas │    │
│  │ Vite + SWC  │   │ Socket.IO    │   │ Constants          │    │
│  └──────┬──────┘   │ Yjs WS Server│   └────────────────────┘    │
│         │          └──────┬───────┘                               │
│         │                 │                                       │
│         ▼                 ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │              Docker Compose Infrastructure              │     │
│  │  PostgreSQL │ Redis │ Judge0 (server+workers) │ LiveKit │     │
│  └─────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

### Data flow

1. **Real-time code sync** — Yjs CRDT via custom WebSocket server (`/yjs/{roomId}`) with Monaco binding (`y-monaco`)
2. **Session events** — Socket.IO for join/leave, telemetry batches, compile status
3. **Video/audio** — LiveKit self-hosted, token generated server-side, `@livekit/components-react` on client
4. **Code execution** — Judge0 self-hosted (unlimited), REST submission with polling
5. **Persistence** — PostgreSQL via Drizzle ORM (sessions, participants, snapshots, telemetry, questions)
6. **State management** — Zustand stores for auth and session state

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 6, TypeScript 5, Tailwind CSS 3, SWC |
| **Editor** | Monaco Editor (`@monaco-editor/react`), y-monaco binding |
| **Collaboration** | Yjs (CRDT), custom WebSocket server (`ws`), y-protocols |
| **Video** | LiveKit (`livekit-client`, `@livekit/components-react`) |
| **Backend** | Express 4, Socket.IO 4, Node.js 18+ |
| **Database** | PostgreSQL 16 (Drizzle ORM, `postgres` driver) |
| **Code execution** | Judge0 v1.13.1 (self-hosted Docker) |
| **Auth** | JWT (access + refresh + session tokens), bcryptjs, httpOnly cookies |
| **Validation** | Zod schemas (shared package) |
| **State** | Zustand 5 |
| **Animations** | Framer Motion 11 |
| **Icons** | Lucide React |
| **Package manager** | pnpm 8+ (workspace) |

---

## Project Structure

```
interviewos/
├── apps/
│   ├── api/                          # Backend API server
│   │   ├── src/
│   │   │   ├── index.ts              # Express + Socket.IO + Yjs setup
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle ORM connection
│   │   │   │   ├── schema.ts         # Full DB schema (9 tables)
│   │   │   │   └── migrations/       # Drizzle migrations (run drizzle-kit)
│   │   │   ├── middleware/
│   │   │   │   └── auth.middleware.ts # JWT + session token validation
│   │   │   ├── routes/
│   │   │   │   ├── auth.routes.ts    # Register, login, refresh, me
│   │   │   │   ├── session.routes.ts # CRUD sessions, join, participants
│   │   │   │   ├── compile.routes.ts # Code execution via Judge0
│   │   │   │   ├── livekit.routes.ts # LiveKit token generation
│   │   │   │   ├── question.routes.ts# CRUD coding questions
│   │   │   │   └── replay.routes.ts  # Session replay data
│   │   │   ├── services/             # Business logic layer
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── compile.service.ts
│   │   │   │   ├── livekit.service.ts
│   │   │   │   ├── question.service.ts
│   │   │   │   ├── session.service.ts
│   │   │   │   ├── snapshot.service.ts
│   │   │   │   └── telemetry.service.ts
│   │   │   ├── socket/              # Socket.IO event handlers
│   │   │   └── yjs/
│   │   │       └── server.ts        # Custom Yjs WebSocket server
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── web/                          # Frontend SPA
│       ├── src/
│       │   ├── App.tsx               # React Router setup
│       │   ├── main.tsx              # Entry point
│       │   ├── pages/
│       │   │   ├── LandingPage.tsx   # Marketing page
│       │   │   ├── LoginPage.tsx     # Auth form
│       │   │   ├── RegisterPage.tsx  # Auth form
│       │   │   ├── DashboardPage.tsx # Session list + create
│       │   │   ├── SessionPage.tsx   # Main interview (editor+video+sidebar)
│       │   │   ├── ReplayPage.tsx    # Session replay viewer
│       │   │   └── JoinPage.tsx      # Invite link handler
│       │   ├── components/
│       │   │   ├── editor/
│       │   │   │   └── MonacoEditor.tsx  # Monaco + y-monaco binding
│       │   │   ├── video/
│       │   │   │   └── VideoRoom.tsx     # LiveKit video component
│       │   │   ├── session/
│       │   │   │   ├── Sidebar.tsx       # Session info, participants, controls
│       │   │   │   ├── OutputPanel.tsx   # Code execution output
│       │   │   │   └── InterviewerControls.tsx
│       │   │   ├── telemetry/
│       │   │   │   └── TelemetryDashboard.tsx
│       │   │   ├── landing/             # Landing page components
│       │   │   └── ui/                  # Shared UI (Button, Input, etc.)
│       │   ├── hooks/
│       │   │   ├── useYjs.ts            # Yjs provider lifecycle management
│       │   │   ├── useTelemetry.ts      # Telemetry event tracking
│       │   │   └── useAntiCheat.ts      # Paste, tab-switch, WPM detection
│       │   ├── lib/
│       │   │   ├── api.ts               # Fetch wrapper with auth
│       │   │   ├── socket.ts            # Socket.IO client
│       │   │   └── cn.ts               # classnames utility
│       │   └── stores/
│       │       ├── authStore.ts         # Zustand auth state
│       │       └── sessionStore.ts      # Zustand session state
│       ├── vite.config.ts               # Vite + proxy config
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared types & validation
│       └── src/
│           ├── index.ts              # Re-exports everything
│           ├── types/
│           │   ├── session.ts        # Session, Participant types
│           │   ├── user.ts           # User, Organization types
│           │   ├── telemetry.ts      # Telemetry event types
│           │   └── socket-events.ts  # Socket.IO event type maps
│           ├── constants/
│           │   ├── actions.ts        # Socket event name constants
│           │   └── languages.ts      # Language configs (id, name, ext)
│           └── validation/
│               └── session.schema.ts # Zod schemas for API validation
│
├── docker-compose.yml                # Infrastructure services
├── livekit.yaml                      # LiveKit server config
├── pnpm-workspace.yaml               # Workspace: apps/*, packages/*
└── package.json                      # Root scripts: dev, build, lint
```

---

## Database Schema

9 tables managed by Drizzle ORM:

| Table | Purpose |
|-------|---------|
| `organizations` | Multi-tenant org with plan (free/paid) |
| `users` | Email/password auth, org membership, roles (admin/member) |
| `refresh_tokens` | JWT refresh token rotation with revocation |
| `questions` | Coding questions with default code, test cases, tags |
| `sessions` | Interview sessions with permissions, timing, LiveKit room |
| `participants` | Session participants (interviewer/candidate/observer) with tokens |
| `code_snapshots` | Periodic + trigger-based code snapshots per session |
| `telemetry_events` | Keystroke, paste, tab-switch, compile, idle events |
| `compilation_results` | Code execution results (stdout, stderr, time, memory) |
| `session_recordings` | LiveKit egress recording metadata |

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **Docker** + **Docker Compose** (for PostgreSQL, Redis, Judge0, LiveKit)

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5433` (mapped from container 5432)
- **Redis** on port `6379`
- **Judge0** server on port `2358` + workers (both require `privileged: true`)
- **LiveKit** on port `7880` (WebRTC on 7881, UDP 50000-50060)

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

Default `.env` values work with the Docker Compose setup:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/interviewos
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-to-a-secure-256-bit-secret
JWT_REFRESH_SECRET=change-me-to-another-secure-256-bit-secret
JUDGE0_API_URL=http://localhost:2358
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=devsecret
LIVEKIT_URL=ws://localhost:7880
PORT=8000
NODE_ENV=development
```

### 3. Install dependencies

```bash
pnpm install
```

### 4. Set up database

```bash
# Generate and run migrations
cd apps/api
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 5. Start development

```bash
# From root — starts both API and Web in parallel
pnpm dev

# Or individually:
pnpm dev:api   # API on http://localhost:8000
pnpm dev:web   # Web on http://localhost:5173
```

The Vite dev server proxies `/api`, `/socket.io`, and `/yjs` to the API server.

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT + sets refresh cookie |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user (requires auth) |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions` | List user's sessions |
| GET | `/api/sessions/:id` | Get session details |
| PATCH | `/api/sessions/:id` | Update session (permissions, status) |
| POST | `/api/sessions/:id/join` | Join session with invite token |
| GET | `/api/sessions/:id/participants` | List participants |

### Code Execution
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/compile` | Submit code to Judge0 |

### LiveKit
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/livekit/token` | Generate LiveKit room token |

### Questions
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/questions` | Create question |
| GET | `/api/questions` | List questions |
| GET | `/api/questions/:id` | Get question |

### Replay
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/replay/:sessionId` | Get snapshots + telemetry for replay |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |

---

## WebSocket Protocols

### Yjs (code sync)
- **Endpoint:** `ws://localhost:8000/yjs/{roomId}`
- **Protocol:** y-protocols sync + awareness
- **Messages:** Binary-encoded Yjs sync, awareness updates
- **Shared type:** `doc.getText('monaco')` — single text type bound to Monaco editor

### Socket.IO (session events)
- **Endpoint:** `ws://localhost:8000/socket.io`
- **Events:**

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `session:join` | Client → Server | `{ sessionId, token }` | Join session room |
| `session:leave` | Client → Server | `{ sessionId }` | Leave session room |
| `telemetry:batch` | Client → Server | `{ sessionId, events[] }` | Batch telemetry events |
| `compile:request` | Client → Server | `{ sessionId, code, languageId, stdin }` | Request compilation |
| `compile:status` | Server → Client | `{ isCompiling }` | Compilation status update |
| `telemetry:summary` | Server → Client | Summary object | Periodic telemetry summary (every 5s) |

---

## Features Implemented

- [x] **User auth** — Register, login, JWT access/refresh tokens, httpOnly cookies
- [x] **Organization support** — Multi-tenant with org-scoped sessions
- [x] **Session management** — Create, join via invite link, RBAC (interviewer/candidate/observer)
- [x] **Real-time code editor** — Monaco Editor with Yjs CRDT sync, multi-cursor awareness
- [x] **Video/audio calls** — LiveKit self-hosted, Google Meet-style layout (stacked in sidebar)
- [x] **Code execution** — Judge0 self-hosted, supports multiple languages
- [x] **Session permissions** — Toggle autocomplete, paste, AI assistance, run code per session
- [x] **Telemetry tracking** — Keystrokes, pastes, tab switches, compile events, idle detection
- [x] **Anti-cheat detection** — Paste monitoring, WPM spike detection, tab-switch tracking
- [x] **Session replay** — Code snapshots (periodic + event-triggered) with telemetry timeline
- [x] **Telemetry dashboard** — Real-time interviewer view of candidate metrics
- [x] **Coding questions** — CRUD with default code templates, test cases, difficulty, tags
- [x] **Landing page** — Marketing page with features, hero, navbar
- [x] **Responsive layout** — Editor left, video+sidebar stacked right (Meet/Zoom style)
- [x] **Code chunking** — Vite manual chunks for Monaco, Yjs, LiveKit, vendor

---

## Known Bugs

### Editor sync may briefly show "Syncing" on initial connect
The Yjs WebSocket server handles Node.js `Buffer` objects which use a pooled `ArrayBuffer`. The fix (`data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)`) is applied but needs verification under load. If sync stalls, check the `conn.on('message')` handler in `apps/api/src/yjs/server.ts`.

### Judge0 code execution on Docker Desktop (macOS/Windows)
The stock `judge0/judge0` image fails on cgroup v2 hosts (`No such file or directory @ rb_sysopen - /box/script.py`). This repo uses `mrkushalsm/judge0:latest` with cgroup mounts instead. After `docker compose up`, wait ~30 seconds before running code. Check `docker compose logs judge0-workers` if runs fail.

### No 404/error pages in frontend
Unknown routes render a blank page. React Router has no catch-all route defined.

### Empty rooms cleaned up after 30s
If all clients disconnect from a Yjs room, the document is destroyed after 30 seconds. Reconnecting after this window starts with a fresh document. Code is preserved via periodic snapshots in the database.

### No rate limiting on auth endpoints
Login and register endpoints have no brute-force protection. Add rate limiting before production deployment.

---

## TODO

### High Priority
- [ ] **Database migrations** — Run `drizzle-kit generate` + `drizzle-kit migrate` to actually create tables
- [ ] **Error pages** — Add 404 and error boundary pages in React Router
- [ ] **Rate limiting** — Add rate limiting middleware (express-rate-limit) on auth routes
- [ ] **End-to-end testing** — No tests exist in the repo

### Medium Priority
- [ ] **Email verification** — Verify email on registration
- [ ] **Password reset** — Forgot password flow
- [ ] **Session recording** — LiveKit egress integration (schema exists, not wired up)
- [ ] **Question bank UI** — Frontend for managing coding questions
- [ ] **Admin dashboard** — Organization management, session analytics
- [ ] **Persistent Yjs documents** — Store Yjs state in DB (currently in-memory only, snapshots are text-only)
- [ ] **Redis adapter for Socket.IO** — Required for horizontal scaling
- [ ] **CSRF protection** — Add CSRF tokens for cookie-based auth

### Low Priority
- [ ] **Dockerfiles for API/Web** — Containerize the application itself (not just infrastructure)
- [ ] **CI/CD pipeline** — GitHub Actions for lint, test, build, deploy
- [ ] **Observability** — Structured logging, health check dashboard, error tracking
- [ ] **Accessibility** — Keyboard navigation, screen reader support
- [ ] **Mobile responsive** — Session page layout for smaller screens
- [ ] **AI code review** — Optional AI feedback on candidate code (schema field exists)

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5433/interviewos` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | (none) | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | (none) | Secret for signing refresh tokens |
| `JUDGE0_API_URL` | `http://localhost:2358` | Judge0 API endpoint |
| `LIVEKIT_API_KEY` | `devkey` | LiveKit API key (must match `livekit.yaml`) |
| `LIVEKIT_API_SECRET` | `devsecret` | LiveKit API secret (must match `livekit.yaml`) |
| `LIVEKIT_URL` | `ws://localhost:7880` | LiveKit WebSocket URL |
| `PORT` | `8000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `CLIENT_URL` | `http://localhost:5173` | CORS origin for the web app |

---

## Docker Services

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | `postgres:16-alpine` | 5433 → 5432 | Main application database |
| `redis` | `redis:7-alpine` | 6379 | Cache, rate limiting, Socket.IO adapter |
| `judge0-server` | `mrkushalsm/judge0:latest` | 2358 | Code execution API (cgroup v2 compatible) |
| `judge0-workers` | `mrkushalsm/judge0:latest` | — | Code execution workers (privileged) |
| `judge0-db` | `postgres:16-alpine` | — | Judge0 internal database |
| `judge0-redis` | `redis:7-alpine` | — | Judge0 internal queue |
| `livekit` | `livekit/livekit-server:latest` | 7880, 7881, 50000-50060/udp | Video/audio WebRTC server |

---

## For AI Agents

This section provides context for AI coding assistants working on this codebase.

### Key patterns
- **Monorepo imports:** Use `@interviewos/shared` for shared types/constants. Never duplicate types.
- **API pattern:** Routes in `routes/` call functions in `services/`. Services use `db` from `db/index.ts`.
- **Yjs setup order:** Yjs WebSocket server MUST be registered before Socket.IO on the HTTP server (see `index.ts`).
- **Vite proxy:** `/api`, `/socket.io`, `/yjs` are all proxied to the API server in `vite.config.ts`.
- **Auth flow:** JWT access token in Authorization header, refresh token in httpOnly cookie, session token for participant access.
- **LiveKit secret:** Must match between `livekit.yaml` (`keys.devkey`) and `.env` (`LIVEKIT_API_SECRET`). Currently both are `devsecret`.

### Common commands
```bash
pnpm dev              # Start all apps in parallel
pnpm dev:api          # Start only API server (tsx watch)
pnpm dev:web          # Start only web client (vite)
docker compose up -d  # Start infrastructure
docker compose down   # Stop infrastructure
cd apps/api && npx drizzle-kit generate  # Generate migrations
cd apps/api && npx drizzle-kit migrate   # Run migrations
cd apps/api && npx drizzle-kit studio    # Open Drizzle Studio (DB viewer)
```

### File conventions
- Route files export an Express Router
- Service files export pure functions (no Express req/res)
- DB schema uses Drizzle ORM's `pgTable` builder
- Frontend stores use Zustand's `create` with TypeScript interfaces
- Hooks follow `use{Feature}` naming, manage lifecycle with refs for stability
