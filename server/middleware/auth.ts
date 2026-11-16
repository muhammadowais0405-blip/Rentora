import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { getDatabase } from '../db/database';
import type { AuthUser } from '../../src/types/marketplace';

export const SESSION_COOKIE_NAME = 'rentora_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'rentora-local-dev-session-secret-2026';

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser | null;
    }
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(':');
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function signSessionToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { uid?: number };
    return typeof parsed.uid === 'number' && parsed.uid > 0 ? parsed.uid : null;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      result[key] = decodeURIComponent(val);
    }
  }
  return result;
}

export function setSessionCookie(res: Response, userId: number): void {
  const token = signSessionToken(userId);
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export function attachAuthUser(req: Request, _res: Response, next: NextFunction): void {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) {
    req.authUser = null;
    next();
    return;
  }

  const userId = verifySessionToken(token);
  if (!userId) {
    req.authUser = null;
    next();
    return;
  }

  try {
    const db = getDatabase();
    const row = db
      .prepare(
        `
        SELECT
          id,
          name,
          email,
          role,
          phone,
          email_verified_demo AS emailVerifiedDemo,
          phone_verified_demo AS phoneVerifiedDemo,
          created_at AS createdAt
        FROM users
        WHERE id = ?
        `,
      )
      .get(userId) as
      | {
          id: number;
          name: string;
          email: string;
          role: 'user' | 'admin';
          phone: string;
          emailVerifiedDemo: number;
          phoneVerifiedDemo: number;
          createdAt: string;
        }
      | undefined;

    req.authUser = row
      ? {
          id: row.id,
          name: row.name,
          email: row.email,
          role: row.role,
          phone: row.phone,
          emailVerifiedDemo: Boolean(row.emailVerifiedDemo),
          phoneVerifiedDemo: Boolean(row.phoneVerifiedDemo),
          createdAt: row.createdAt,
        }
      : null;
  } catch {
    req.authUser = null;
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: 'Please sign in to continue.' });
    return;
  }
  if (req.authUser.role !== 'admin') {
    res.status(403).json({ error: 'Moderator access is required for this action.' });
    return;
  }
  next();
}
