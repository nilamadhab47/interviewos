import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db';
import { users, organizations, refreshTokens } from '../db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export interface TokenPayload {
  type: 'user';
  userId: string;
  email: string;
  orgId: string;
  role: string;
}

export interface SessionTokenPayload {
  type: 'session';
  participantId: string;
  sessionId: string;
  role: string;
}

function generateAccessToken(payload: Omit<TokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'user' }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

export function verifyAccessToken(token: string): TokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
  if (payload.type && payload.type !== 'user') {
    throw new Error('Not a user token');
  }
  return payload;
}

export function generateSessionToken(payload: Omit<SessionTokenPayload, 'type'>): string {
  return jwt.sign({ ...payload, type: 'session' }, JWT_SECRET, { expiresIn: '8h' });
}

export function verifySessionToken(token: string): SessionTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as SessionTokenPayload;
  if (payload.type !== 'session') {
    throw new Error('Not a session token');
  }
  return payload;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  orgName: string;
}) {
  // Check if user already exists
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 12);

  // Create organization
  const [org] = await db
    .insert(organizations)
    .values({
      name: input.orgName,
      slug: slugify(input.orgName) + '-' + crypto.randomBytes(3).toString('hex'),
    })
    .returning();

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      passwordHash,
      name: input.name,
      orgId: org.id,
      role: 'admin',
    })
    .returning();

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    orgId: org.id,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      orgId: org.id,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function loginUser(input: { email: string; password: string }) {
  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    userId: user.id,
    email: user.email,
    orgId: user.orgId!,
    role: user.role,
  });

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

  // Store refresh token
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: refreshTokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(oldRefreshToken: string) {
  // Find all non-revoked, non-expired refresh tokens
  const tokens = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.revokedAt, null as unknown as Date));

  // Check each token hash (we can't query by hash directly)
  for (const tokenRow of tokens) {
    if (new Date() > tokenRow.expiresAt) continue;

    const valid = await bcrypt.compare(oldRefreshToken, tokenRow.tokenHash);
    if (!valid) continue;

    // Revoke old token
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, tokenRow.id));

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, tokenRow.userId))
      .limit(1);

    if (!user) throw new Error('User not found');

    // Generate new token pair
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      orgId: user.orgId!,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        orgId: user.orgId,
        role: user.role,
      },
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  throw new Error('Invalid or expired refresh token');
}
