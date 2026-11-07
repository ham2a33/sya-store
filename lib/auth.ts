import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import type { SessionPayload, UserRecord, UserRole } from './types';
import { getUserByEmail, getUserById } from './users-store';

const SESSION_COOKIE = 'sya-session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is not configured');
  }
  return 'dev-session-secret-change-me';
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const testHash = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

function signPayload(payload: SessionPayload): string {
  const secret = getSessionSecret();
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = scryptSync(`${data}.${secret}`, 'sya-session-salt', 32).toString(
    'base64url',
  );
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;

  try {
    const secret = getSessionSecret();
    const [data, signature] = token.split('.');
    if (!data || !signature) return null;

    const expected = scryptSync(`${data}.${secret}`, 'sya-session-salt', 32).toString(
      'base64url',
    );
    if (expected !== signature) return null;

    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as SessionPayload;

    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(user: Pick<UserRecord, 'id' | 'email' | 'role'>): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + SESSION_TTL_MS,
  };
  return signPayload(payload);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function getSessionCookieOptions(maxAgeSeconds = 60 * 60 * 24 * 7) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export function getSessionFromRequest(request: NextRequest | Request): SessionPayload | null {
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return verifySessionToken(match?.[1]);
}

export async function requireAdminSession(): Promise<SessionPayload> {
  const session = await getSessionFromCookies();
  if (!session || session.role !== 'admin') {
    throw new Error('FORBIDDEN');
  }
  return session;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<UserRecord | null> {
  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return null;
  }
  return user;
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const session = await getSessionFromCookies();
  if (!session) return null;
  const user = await getUserById(session.userId);
  return user ?? null;
}

export type { UserRole };
