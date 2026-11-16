import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import { requireAdmin, requireAuth } from '../middleware/auth';

const moderationStatusSchema = z.object({
  status: z.enum(['active', 'hidden', 'pending']),
});

const resolveReportSchema = z.object({
  hideListing: z.boolean().optional().default(false),
});

export function createAdminRouter(): Router {
  const router = Router();

  router.use(requireAuth, requireAdmin);

  router.get('/listings', (_req, res) => {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT
          l.id,
          l.title,
          l.owner_id AS ownerId,
          u.name AS ownerName,
          u.email AS ownerEmail,
          c.name AS categoryName,
          l.subcategory,
          l.daily_price AS dailyPrice,
          l.deposit_amount AS depositAmount,
          l.location_text AS locationText,
          l.condition,
          l.status,
          l.is_featured AS isFeatured,
          (
            SELECT li.file_path
            FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.is_cover DESC, li.sort_order ASC
            LIMIT 1
          ) AS coverImage,
          l.created_at AS createdAt
        FROM listings l
        JOIN users u ON u.id = l.owner_id
        JOIN categories c ON c.id = l.category_id
        WHERE l.status != 'archived'
        ORDER BY CASE l.status WHEN 'pending' THEN 0 WHEN 'hidden' THEN 1 ELSE 2 END, l.id DESC
        `,
      )
      .all() as Array<{
      id: number;
      title: string;
      ownerId: number;
      ownerName: string;
      ownerEmail: string;
      categoryName: string;
      subcategory: string;
      dailyPrice: number;
      depositAmount: number;
      locationText: string;
      condition: string;
      status: 'pending' | 'active' | 'hidden' | 'archived';
      isFeatured: number;
      coverImage: string | null;
      createdAt: string;
    }>;

    res.json({
      listings: rows.map((row) => ({
        ...row,
        isFeatured: Boolean(row.isFeatured),
        coverImage: row.coverImage ?? '',
      })),
    });
  });

  router.patch('/listings/:id/status', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    const parsed = moderationStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid moderation status.' });
      return;
    }

    const db = getDatabase();
    const existing = db
      .prepare('SELECT id, owner_id AS ownerId, title, status FROM listings WHERE id = ?')
      .get(id) as { id: number; ownerId: number; title: string; status: string } | undefined;

    if (!existing || existing.status === 'archived') {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    const nextStatus = parsed.data.status;
    const modTx = db.transaction(() => {
      db.prepare('UPDATE listings SET status = ? WHERE id = ?').run(nextStatus, id);

      const message =
        nextStatus === 'active'
          ? `Your listing "${existing.title}" is now approved and live in Rentora Browse.`
          : nextStatus === 'hidden'
            ? `Your listing "${existing.title}" was hidden by a demo moderator.`
            : `Your listing "${existing.title}" was returned to pending review.`;

      db.prepare(
        'INSERT INTO notifications (user_id, title, body, is_read) VALUES (?, ?, ?, 0)',
      ).run(existing.ownerId, 'Listing moderation update', message);
    });

    modTx();
    res.json({ id, status: nextStatus });
  });

  router.get('/users', (_req, res) => {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT
          u.id,
          u.name,
          u.email,
          u.role,
          u.phone,
          u.email_verified_demo AS emailVerifiedDemo,
          u.phone_verified_demo AS phoneVerifiedDemo,
          u.created_at AS createdAt,
          (SELECT COUNT(*) FROM listings l WHERE l.owner_id = u.id AND l.status != 'archived') AS listingsCount,
          (SELECT COUNT(*) FROM bookings b WHERE b.renter_id = u.id OR b.owner_id = u.id) AS bookingsCount
        FROM users u
        ORDER BY u.id ASC
        `,
      )
      .all() as Array<{
      id: number;
      name: string;
      email: string;
      role: 'user' | 'admin';
      phone: string;
      emailVerifiedDemo: number;
      phoneVerifiedDemo: number;
      createdAt: string;
      listingsCount: number;
      bookingsCount: number;
    }>;

    res.json({
      users: rows.map((u) => ({
        ...u,
        emailVerifiedDemo: Boolean(u.emailVerifiedDemo),
        phoneVerifiedDemo: Boolean(u.phoneVerifiedDemo),
      })),
    });
  });

  router.get('/reports', (_req, res) => {
    const db = getDatabase();
    const reports = db
      .prepare(
        `
        SELECT
          r.id,
          r.listing_id AS listingId,
          l.title AS listingTitle,
          l.status AS listingStatus,
          u.name AS reporterName,
          r.reason,
          r.status,
          r.created_at AS createdAt
        FROM listing_reports r
        JOIN listings l ON l.id = r.listing_id
        JOIN users u ON u.id = r.reporter_id
        ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.id DESC
        `,
      )
      .all();

    res.json({ reports });
  });

  router.patch('/reports/:id/resolve', (req, res) => {
    const reportId = Number(req.params.id);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      res.status(400).json({ error: 'Invalid report ID.' });
      return;
    }

    const parsed = resolveReportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body.' });
      return;
    }

    const db = getDatabase();
    const report = db
      .prepare('SELECT id, listing_id AS listingId FROM listing_reports WHERE id = ?')
      .get(reportId) as { id: number; listingId: number } | undefined;

    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }

    const resolveTx = db.transaction(() => {
      db.prepare("UPDATE listing_reports SET status = 'resolved' WHERE id = ?").run(reportId);
      if (parsed.data.hideListing) {
        db.prepare("UPDATE listings SET status = 'hidden' WHERE id = ?").run(report.listingId);
      }
    });

    resolveTx();
    res.json({ ok: true, id: reportId, status: 'resolved' });
  });

  return router;
}
