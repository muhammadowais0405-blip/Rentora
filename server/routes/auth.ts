import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import {
  clearSessionCookie,
  hashPassword,
  requireAuth,
  setSessionCookie,
  verifyPassword,
} from '../middleware/auth';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(120),
  password: z.string().min(6).max(100),
  phone: z.string().trim().max(30).optional().default(''),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().max(30),
});

const demoSwitchSchema = z.object({
  email: z.enum(['renter@rentora.demo', 'owner@rentora.demo', 'admin@rentora.demo']),
});

export function createAuthRouter(): Router {
  const router = Router();

  router.get('/me', (req, res) => {
    res.json({ user: req.authUser ?? null });
  });

  router.post('/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Enter a valid email address and password.' });
      return;
    }

    const db = getDatabase();
    const row = db
      .prepare(
        `
        SELECT id, name, email, password_hash AS passwordHash, role, phone,
               email_verified_demo AS emailVerifiedDemo,
               phone_verified_demo AS phoneVerifiedDemo,
               created_at AS createdAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
        `,
      )
      .get(parsed.data.email.trim()) as
      | {
          id: number;
          name: string;
          email: string;
          passwordHash: string;
          role: 'user' | 'admin';
          phone: string;
          emailVerifiedDemo: number;
          phoneVerifiedDemo: number;
          createdAt: string;
        }
      | undefined;

    if (!row || !verifyPassword(parsed.data.password, row.passwordHash)) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    setSessionCookie(res, row.id);
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        phone: row.phone,
        emailVerifiedDemo: Boolean(row.emailVerifiedDemo),
        phoneVerifiedDemo: Boolean(row.phoneVerifiedDemo),
        createdAt: row.createdAt,
      },
    });
  });

  router.post('/demo-switch', (req, res) => {
    const parsed = demoSwitchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Unknown demo account.' });
      return;
    }

    const db = getDatabase();
    const row = db
      .prepare(
        `
        SELECT id, name, email, role, phone,
               email_verified_demo AS emailVerifiedDemo,
               phone_verified_demo AS phoneVerifiedDemo,
               created_at AS createdAt
        FROM users
        WHERE LOWER(email) = LOWER(?)
        `,
      )
      .get(parsed.data.email) as
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

    if (!row) {
      res.status(404).json({ error: 'Seeded demo account not found.' });
      return;
    }

    setSessionCookie(res, row.id);
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        phone: row.phone,
        emailVerifiedDemo: Boolean(row.emailVerifiedDemo),
        phoneVerifiedDemo: Boolean(row.phoneVerifiedDemo),
        createdAt: row.createdAt,
      },
    });
  });

  router.post('/register', (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Please enter a name (2+ characters), valid email, and password (6+ characters).',
      });
      return;
    }

    const db = getDatabase();
    const existing = db
      .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
      .get(parsed.data.email.trim());

    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const passwordHash = hashPassword(parsed.data.password);
    const createdAt = new Date().toISOString().slice(0, 10);
    const result = db
      .prepare(
        `
        INSERT INTO users (name, email, password_hash, role, phone, email_verified_demo, phone_verified_demo, created_at)
        VALUES (?, ?, ?, 'user', ?, 1, 0, ?)
        `,
      )
      .run(
        parsed.data.name,
        parsed.data.email.toLowerCase(),
        passwordHash,
        parsed.data.phone,
        createdAt,
      );

    const newId = Number(result.lastInsertRowid);
    setSessionCookie(res, newId);

    res.status(201).json({
      user: {
        id: newId,
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        role: 'user',
        phone: parsed.data.phone,
        emailVerifiedDemo: true,
        phoneVerifiedDemo: false,
        createdAt,
      },
    });
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.patch('/profile', requireAuth, (req, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Name must be at least 2 characters.' });
      return;
    }

    const db = getDatabase();
    db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(
      parsed.data.name,
      parsed.data.phone,
      req.authUser!.id,
    );

    res.json({
      user: {
        ...req.authUser!,
        name: parsed.data.name,
        phone: parsed.data.phone,
      },
    });
  });

  return router;
}
