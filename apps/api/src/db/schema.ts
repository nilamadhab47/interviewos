import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  bigserial,
  doublePrecision,
  index,
} from 'drizzle-orm/pg-core';

// ─── Organizations ───
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Users ───
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: text('avatar_url'),
  orgId: uuid('org_id').references(() => organizations.id),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Refresh Tokens ───
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Questions ───
export const questions = pgTable('questions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').notNull(),
  difficulty: varchar('difficulty', { length: 10 }).notNull(),
  defaultCode: jsonb('default_code').notNull().default({}),
  testCases: jsonb('test_cases').notNull().default([]),
  tags: text('tags').array().default([]),
  isPublic: boolean('is_public').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Sessions ───
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').references(() => organizations.id).notNull(),
  title: varchar('title', { length: 500 }),
  status: varchar('status', { length: 20 }).notNull().default('created'),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  questionId: uuid('question_id').references(() => questions.id),
  language: varchar('language', { length: 30 }).notNull().default('javascript'),

  // Permissions
  allowAutocomplete: boolean('allow_autocomplete').notNull().default(true),
  allowPaste: boolean('allow_paste').notNull().default(true),
  allowAi: boolean('allow_ai').notNull().default(false),
  allowRunCode: boolean('allow_run_code').notNull().default(true),

  // LiveKit
  livekitRoomName: varchar('livekit_room_name', { length: 255 }),

  // Timing
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  durationLimit: integer('duration_limit').default(3600),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Participants ───
export const participants = pgTable('participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  userId: uuid('user_id').references(() => users.id),
  email: varchar('email', { length: 255 }),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  token: varchar('token', { length: 64 }).unique().notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }),
  leftAt: timestamp('left_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Code Snapshots ───
export const codeSnapshots = pgTable('code_snapshots', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  participantId: uuid('participant_id').references(() => participants.id),
  code: text('code').notNull(),
  language: varchar('language', { length: 30 }).notNull(),
  trigger: varchar('trigger', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_snapshots_session').on(table.sessionId, table.createdAt),
]);

// ─── Telemetry Events ───
export const telemetryEvents = pgTable('telemetry_events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  participantId: uuid('participant_id').references(() => participants.id).notNull(),
  eventType: varchar('event_type', { length: 30 }).notNull(),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_telemetry_session').on(table.sessionId, table.createdAt),
  index('idx_telemetry_type').on(table.sessionId, table.eventType),
]);

// ─── Compilation Results ───
export const compilationResults = pgTable('compilation_results', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  participantId: uuid('participant_id').references(() => participants.id),
  language: varchar('language', { length: 30 }).notNull(),
  code: text('code').notNull(),
  stdin: text('stdin'),
  stdout: text('stdout'),
  stderr: text('stderr'),
  status: varchar('status', { length: 50 }),
  exitCode: integer('exit_code'),
  timeMs: doublePrecision('time_ms'),
  memoryKb: integer('memory_kb'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Session Recordings ───
export const sessionRecordings = pgTable('session_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').references(() => sessions.id).notNull(),
  livekitEgressId: varchar('livekit_egress_id', { length: 255 }),
  storageUrl: text('storage_url'),
  durationSec: integer('duration_sec'),
  sizeByte: integer('size_bytes'),
  status: varchar('status', { length: 20 }).notNull().default('recording'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
