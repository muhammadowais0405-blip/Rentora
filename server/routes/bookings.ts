import { Router } from 'express';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import { requireAuth } from '../middleware/auth';
import {
  calculateBookingEstimate,
  formatPkr,
  hasDateOverlap,
} from '../../src/utils/rentalMath';
import {
  canReviewBooking,
  canTransitionBookingStatus,
  type BookingStatus,
  type PaymentStatus,
} from '../../src/utils/bookingRules';

const createBookingSchema = z.object({
  listingId: z.coerce.number().int().positive(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid pickup date.'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid return date.'),
  renterNote: z.string().trim().max(400).optional().default(''),
});

const bookingStatusSchema = z.object({
  status: z.enum(['approved', 'declined', 'cancelled', 'completed']),
});

const reviewSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .min(8, 'Please write at least 8 characters for your review.')
    .max(800),
});

const promoteSchema = z.object({
  planName: z.enum(['7-Day Spotlight (Demo)', '30-Day Featured Boost (Demo)']),
});

function addDaysIso(offsetDays: number): string {
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

interface RawBookingRow {
  id: number;
  listingId: number;
  listingTitle: string;
  listingCoverImage: string | null;
  listingLocation: string;
  renterId: number;
  renterName: string;
  ownerId: number;
  ownerName: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyPriceSnapshot: number;
  rentalTotal: number;
  depositSnapshot: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paidDemoAt: string | null;
  renterNote: string;
  hasReviewed: number;
  createdAt: string;
}

function mapBookingSummary(row: RawBookingRow) {
  return {
    id: row.id,
    listingId: row.listingId,
    listingTitle: row.listingTitle,
    listingCoverImage: row.listingCoverImage ?? '',
    listingLocation: row.listingLocation,
    renterId: row.renterId,
    renterName: row.renterName,
    ownerId: row.ownerId,
    ownerName: row.ownerName,
    startDate: row.startDate,
    endDate: row.endDate,
    rentalDays: row.rentalDays,
    dailyPriceSnapshot: row.dailyPriceSnapshot,
    rentalTotal: row.rentalTotal,
    depositSnapshot: row.depositSnapshot,
    status: row.status,
    paymentStatus: row.paymentStatus,
    paidDemoAt: row.paidDemoAt,
    renterNote: row.renterNote ?? '',
    hasReviewed: Boolean(row.hasReviewed),
    createdAt: row.createdAt,
  };
}

export function createBookingsRouter(): Router {
  const router = Router();

  // --- Favorites ---
  router.get('/favorites', requireAuth, (req, res) => {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT
          l.id,
          l.owner_id AS ownerId,
          u.name AS ownerName,
          l.category_id AS categoryId,
          c.name AS categoryName,
          c.slug AS categorySlug,
          l.subcategory,
          l.title,
          l.condition,
          l.daily_price AS dailyPrice,
          l.deposit_amount AS depositAmount,
          l.location_text AS locationText,
          l.status,
          l.is_featured AS isFeatured,
          l.created_at AS createdAt,
          (
            SELECT li.file_path
            FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.is_cover DESC, li.sort_order ASC
            LIMIT 1
          ) AS coverImage,
          ROUND(COALESCE(AVG(r.rating), 4.8), 1) AS rating,
          COUNT(DISTINCT r.id) AS reviewCount
        FROM favorites f
        JOIN listings l ON l.id = f.listing_id
        JOIN users u ON u.id = l.owner_id
        JOIN categories c ON c.id = l.category_id
        LEFT JOIN reviews r ON r.listing_id = l.id
        WHERE f.user_id = ? AND l.status = 'active'
        GROUP BY l.id
        ORDER BY f.id DESC
        `,
      )
      .all(req.authUser!.id) as Array<{
      id: number;
      ownerId: number;
      ownerName: string;
      categoryId: number;
      categoryName: string;
      categorySlug: string;
      subcategory: string;
      title: string;
      condition: string;
      dailyPrice: number;
      depositAmount: number;
      locationText: string;
      status: string;
      isFeatured: number;
      createdAt: string;
      coverImage: string | null;
      rating: number | null;
      reviewCount: number;
    }>;

    const items = rows.map((row) => ({
      ...row,
      isFeatured: Boolean(row.isFeatured),
      coverImage: row.coverImage ?? '',
      rating: row.rating ?? 4.8,
    }));

    res.json({
      items,
      ids: items.map((i) => i.id),
    });
  });

  router.post('/favorites/:listingId', requireAuth, (req, res) => {
    const listingId = Number(req.params.listingId);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    const db = getDatabase();
    const listing = db
      .prepare("SELECT id FROM listings WHERE id = ? AND status = 'active'")
      .get(listingId) as { id: number } | undefined;

    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    db.prepare(
      'INSERT OR IGNORE INTO favorites (user_id, listing_id) VALUES (?, ?)',
    ).run(req.authUser!.id, listingId);

    res.status(201).json({ saved: true, listingId });
  });

  router.delete('/favorites/:listingId', requireAuth, (req, res) => {
    const listingId = Number(req.params.listingId);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    const db = getDatabase();
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND listing_id = ?').run(
      req.authUser!.id,
      listingId,
    );

    res.json({ saved: false, listingId });
  });

  // --- Bookings ---
  router.post('/bookings', requireAuth, (req, res) => {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid booking request details.',
      });
      return;
    }

    const { listingId, startDate, endDate, renterNote } = parsed.data;
    const db = getDatabase();

    const listing = db
      .prepare(
        `
        SELECT id, owner_id AS ownerId, title, daily_price AS dailyPrice,
               deposit_amount AS depositAmount, status
        FROM listings
        WHERE id = ?
        `,
      )
      .get(listingId) as
      | {
          id: number;
          ownerId: number;
          title: string;
          dailyPrice: number;
          depositAmount: number;
          status: string;
        }
      | undefined;

    if (!listing || listing.status !== 'active') {
      res.status(404).json({ error: 'This listing is not available for booking.' });
      return;
    }

    if (listing.ownerId === req.authUser!.id) {
      res.status(400).json({
        error: 'You cannot send a booking request for your own listing.',
      });
      return;
    }

    const approvedRanges = db
      .prepare(
        `
        SELECT start_date AS startDate, end_date AS endDate
        FROM bookings
        WHERE listing_id = ? AND status = 'approved'
        `,
      )
      .all(listingId) as Array<{ startDate: string; endDate: string }>;

    const estimate = calculateBookingEstimate(
      listing.dailyPrice,
      listing.depositAmount,
      startDate,
      endDate,
      approvedRanges,
    );

    if (!estimate.valid) {
      res.status(estimate.hasOverlap ? 409 : 400).json({
        error: estimate.error ?? 'Selected dates are unavailable.',
      });
      return;
    }

    const createBookingTx = db.transaction(() => {
      const result = db
        .prepare(
          `
          INSERT INTO bookings (
            listing_id, renter_id, owner_id, start_date, end_date,
            rental_days, daily_price_snapshot, rental_total, deposit_snapshot,
            status, payment_status, renter_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?)
          `,
        )
        .run(
          listing.id,
          req.authUser!.id,
          listing.ownerId,
          startDate,
          endDate,
          estimate.days,
          listing.dailyPrice,
          estimate.rentalTotal,
          listing.depositAmount,
          renterNote,
        );

      const bookingId = Number(result.lastInsertRowid);

      db.prepare(
        `
        INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by)
        VALUES (?, NULL, 'pending', ?)
        `,
      ).run(bookingId, req.authUser!.id);

      db.prepare(
        `
        INSERT INTO notifications (user_id, title, body, is_read)
        VALUES (?, ?, ?, 0)
        `,
      ).run(
        listing.ownerId,
        'New booking request received',
        `${req.authUser!.name} requested ${listing.title} from ${startDate} to ${endDate} (${formatPkr(estimate.rentalTotal)}).`,
      );

      return bookingId;
    });

    const bookingId = createBookingTx();
    res.status(201).json({
      id: bookingId,
      status: 'pending',
      rentalDays: estimate.days,
      rentalTotal: estimate.rentalTotal,
      depositSnapshot: listing.depositAmount,
    });
  });

  const baseBookingsQuery = `
    SELECT
      b.id,
      b.listing_id AS listingId,
      l.title AS listingTitle,
      (
        SELECT li.file_path
        FROM listing_images li
        WHERE li.listing_id = l.id
        ORDER BY li.is_cover DESC, li.sort_order ASC
        LIMIT 1
      ) AS listingCoverImage,
      l.location_text AS listingLocation,
      b.renter_id AS renterId,
      renter.name AS renterName,
      b.owner_id AS ownerId,
      owner.name AS ownerName,
      b.start_date AS startDate,
      b.end_date AS endDate,
      b.rental_days AS rentalDays,
      b.daily_price_snapshot AS dailyPriceSnapshot,
      b.rental_total AS rentalTotal,
      b.deposit_snapshot AS depositSnapshot,
      b.status,
      b.payment_status AS paymentStatus,
      b.paid_demo_at AS paidDemoAt,
      b.renter_note AS renterNote,
      EXISTS(SELECT 1 FROM reviews rev WHERE rev.booking_id = b.id) AS hasReviewed,
      b.created_at AS createdAt
    FROM bookings b
    JOIN listings l ON l.id = b.listing_id
    JOIN users renter ON renter.id = b.renter_id
    JOIN users owner ON owner.id = b.owner_id
  `;

  router.get('/bookings/mine', requireAuth, (req, res) => {
    const db = getDatabase();
    const rows = db
      .prepare(`${baseBookingsQuery} WHERE b.renter_id = ? ORDER BY b.id DESC`)
      .all(req.authUser!.id) as RawBookingRow[];

    res.json({ bookings: rows.map(mapBookingSummary) });
  });

  router.get('/bookings/received', requireAuth, (req, res) => {
    const db = getDatabase();
    const rows = db
      .prepare(`${baseBookingsQuery} WHERE b.owner_id = ? ORDER BY b.id DESC`)
      .all(req.authUser!.id) as RawBookingRow[];

    res.json({ bookings: rows.map(mapBookingSummary) });
  });

  router.get('/bookings/:id', requireAuth, (req, res) => {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      res.status(400).json({ error: 'Invalid booking ID.' });
      return;
    }

    const db = getDatabase();
    const row = db
      .prepare(
        `
        SELECT
          b.id,
          b.listing_id AS listingId,
          l.title AS listingTitle,
          (
            SELECT li.file_path
            FROM listing_images li
            WHERE li.listing_id = l.id
            ORDER BY li.is_cover DESC, li.sort_order ASC
            LIMIT 1
          ) AS listingCoverImage,
          l.location_text AS listingLocation,
          c.name AS listingCategoryName,
          l.condition AS listingCondition,
          b.renter_id AS renterId,
          renter.name AS renterName,
          renter.email AS renterEmail,
          renter.phone AS renterPhone,
          b.owner_id AS ownerId,
          owner.name AS ownerName,
          owner.email AS ownerEmail,
          owner.phone AS ownerPhone,
          b.start_date AS startDate,
          b.end_date AS endDate,
          b.rental_days AS rentalDays,
          b.daily_price_snapshot AS dailyPriceSnapshot,
          b.rental_total AS rentalTotal,
          b.deposit_snapshot AS depositSnapshot,
          b.status,
          b.payment_status AS paymentStatus,
          b.paid_demo_at AS paidDemoAt,
          b.renter_note AS renterNote,
          EXISTS(SELECT 1 FROM reviews rev WHERE rev.booking_id = b.id) AS hasReviewed,
          b.created_at AS createdAt
        FROM bookings b
        JOIN listings l ON l.id = b.listing_id
        JOIN categories c ON c.id = l.category_id
        JOIN users renter ON renter.id = b.renter_id
        JOIN users owner ON owner.id = b.owner_id
        WHERE b.id = ?
        `,
      )
      .get(bookingId) as
      | (RawBookingRow & {
          listingCategoryName: string;
          listingCondition: string;
          renterEmail: string;
          renterPhone: string;
          ownerEmail: string;
          ownerPhone: string;
        })
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const isParticipant =
      row.renterId === req.authUser!.id ||
      row.ownerId === req.authUser!.id ||
      req.authUser!.role === 'admin';

    if (!isParticipant) {
      res.status(403).json({ error: 'You do not have permission to view this booking.' });
      return;
    }

    const statusHistory = db
      .prepare(
        `
        SELECT h.id, h.old_status AS oldStatus, h.new_status AS newStatus,
               u.name AS changedByName, h.created_at AS createdAt
        FROM booking_status_history h
        LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.booking_id = ?
        ORDER BY h.id ASC
        `,
      )
      .all(bookingId) as Array<{
      id: number;
      oldStatus: string | null;
      newStatus: string;
      changedByName: string | null;
      createdAt: string;
    }>;

    const review = db
      .prepare(
        `
        SELECT id, rating, comment, created_at AS createdAt
        FROM reviews
        WHERE booking_id = ?
        LIMIT 1
        `,
      )
      .get(bookingId) as
      | { id: number; rating: number; comment: string; createdAt: string }
      | undefined;

    res.json({
      booking: {
        ...mapBookingSummary(row),
        listingCategoryName: row.listingCategoryName,
        listingCondition: row.listingCondition,
        renterEmail: row.renterEmail,
        renterPhone: row.renterPhone,
        ownerEmail: row.ownerEmail,
        ownerPhone: row.ownerPhone,
        statusHistory,
        review: review ?? null,
      },
    });
  });

  router.patch('/bookings/:id/status', requireAuth, (req, res) => {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      res.status(400).json({ error: 'Invalid booking ID.' });
      return;
    }

    const parsed = bookingStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid target booking status.' });
      return;
    }

    const nextStatus = parsed.data.status;
    const db = getDatabase();

    const booking = db
      .prepare(
        `
        SELECT b.id, b.listing_id AS listingId, b.renter_id AS renterId, b.owner_id AS ownerId,
               b.start_date AS startDate, b.end_date AS endDate, b.status, l.title AS listingTitle
        FROM bookings b
        JOIN listings l ON l.id = b.listing_id
        WHERE b.id = ?
        `,
      )
      .get(bookingId) as
      | {
          id: number;
          listingId: number;
          renterId: number;
          ownerId: number;
          startDate: string;
          endDate: string;
          status: BookingStatus;
          listingTitle: string;
        }
      | undefined;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const isOwner = booking.ownerId === req.authUser!.id;
    const isRenter = booking.renterId === req.authUser!.id;
    const isAdmin = req.authUser!.role === 'admin';

    if (!isOwner && !isRenter && !isAdmin) {
      res.status(403).json({ error: 'You are not part of this booking.' });
      return;
    }

    const transition = canTransitionBookingStatus({
      currentStatus: booking.status,
      nextStatus,
      isOwner,
      isRenter,
      isAdmin,
    });

    if (!transition.allowed) {
      const code =
        (!isOwner && (nextStatus === 'approved' || nextStatus === 'declined')) ||
        (!isRenter && nextStatus === 'cancelled') ||
        (!isOwner && !isAdmin && nextStatus === 'completed')
          ? 403
          : 400;
      res.status(code).json({ error: transition.reason ?? 'Status update not permitted.' });
      return;
    }

    const runUpdateTx = db.transaction(() => {
      if (nextStatus === 'approved') {
        const otherApproved = db
          .prepare(
            `
            SELECT start_date AS startDate, end_date AS endDate
            FROM bookings
            WHERE listing_id = ? AND status = 'approved' AND id != ?
            `,
          )
          .all(booking.listingId, booking.id) as Array<{
          startDate: string;
          endDate: string;
        }>;

        if (hasDateOverlap(booking.startDate, booking.endDate, otherApproved)) {
          return { conflict: true };
        }
      }

      db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(
        nextStatus,
        booking.id,
      );

      db.prepare(
        `
        INSERT INTO booking_status_history (booking_id, old_status, new_status, changed_by)
        VALUES (?, ?, ?, ?)
        `,
      ).run(booking.id, booking.status, nextStatus, req.authUser!.id);

      let notifyUserId = booking.renterId;
      let notifyTitle = 'Booking status updated';
      let notifyBody = `Booking #${booking.id} for ${booking.listingTitle} is now ${nextStatus}.`;

      if (nextStatus === 'approved') {
        notifyTitle = 'Booking request approved';
        notifyBody = `${req.authUser!.name} approved your booking for ${booking.listingTitle} (${booking.startDate} to ${booking.endDate}).`;
      } else if (nextStatus === 'declined') {
        notifyTitle = 'Booking request declined';
        notifyBody = `${req.authUser!.name} declined your request for ${booking.listingTitle}.`;
      } else if (nextStatus === 'cancelled') {
        notifyUserId = booking.ownerId;
        notifyTitle = 'Booking request cancelled';
        notifyBody = `${req.authUser!.name} cancelled their pending request for ${booking.listingTitle}.`;
      } else if (nextStatus === 'completed') {
        notifyTitle = 'Rental marked completed';
        notifyBody = `Your rental of ${booking.listingTitle} is marked complete. You can now leave a review.`;
      }

      db.prepare(
        `
        INSERT INTO notifications (user_id, title, body, is_read)
        VALUES (?, ?, ?, 0)
        `,
      ).run(notifyUserId, notifyTitle, notifyBody);

      return { conflict: false };
    });

    const outcome = runUpdateTx();
    if (outcome.conflict) {
      res.status(409).json({
        error:
          'Cannot approve this request because those dates overlap another approved booking for this item.',
      });
      return;
    }

    res.json({ id: booking.id, status: nextStatus });
  });

  // Simulated demo payment confirmation (renter only, approved bookings only)
  router.post('/bookings/:id/pay-demo', requireAuth, (req, res) => {
    const bookingId = Number(req.params.id);
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
      res.status(400).json({ error: 'Invalid booking ID.' });
      return;
    }

    const db = getDatabase();
    const booking = db
      .prepare(
        `
        SELECT b.id, b.renter_id AS renterId, b.owner_id AS ownerId, b.status,
               b.payment_status AS paymentStatus, b.rental_total AS rentalTotal,
               l.title AS listingTitle
        FROM bookings b
        JOIN listings l ON l.id = b.listing_id
        WHERE b.id = ?
        `,
      )
      .get(bookingId) as
      | {
          id: number;
          renterId: number;
          ownerId: number;
          status: BookingStatus;
          paymentStatus: PaymentStatus;
          rentalTotal: number;
          listingTitle: string;
        }
      | undefined;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    if (booking.renterId !== req.authUser!.id) {
      res.status(403).json({ error: 'Only the renter can confirm demo payment for this booking.' });
      return;
    }

    if (booking.status !== 'approved') {
      res.status(400).json({ error: 'Demo payment is available only after owner approval.' });
      return;
    }

    if (booking.paymentStatus === 'paid_demo') {
      res.status(400).json({ error: 'Demo payment is already confirmed.' });
      return;
    }

    const payTx = db.transaction(() => {
      db.prepare(
        "UPDATE bookings SET payment_status = 'paid_demo', paid_demo_at = datetime('now') WHERE id = ?",
      ).run(booking.id);

      db.prepare(
        'INSERT INTO notifications (user_id, title, body, is_read) VALUES (?, ?, ?, 0)',
      ).run(
        booking.ownerId,
        'Demo payment confirmed',
        `${req.authUser!.name} confirmed simulated demo payment (${formatPkr(booking.rentalTotal)}) for ${booking.listingTitle}.`,
      );
    });

    payTx();
    res.json({ id: booking.id, paymentStatus: 'paid_demo' });
  });

  // --- Reviews ---
  router.post('/reviews', requireAuth, (req, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Please enter a valid rating and comment.',
      });
      return;
    }

    const { bookingId, rating, comment } = parsed.data;
    const db = getDatabase();

    const booking = db
      .prepare(
        `
        SELECT b.id, b.listing_id AS listingId, b.renter_id AS renterId,
               b.owner_id AS ownerId, b.status, l.title AS listingTitle,
               EXISTS(SELECT 1 FROM reviews rev WHERE rev.booking_id = b.id AND rev.reviewer_id = ?) AS alreadyReviewed
        FROM bookings b
        JOIN listings l ON l.id = b.listing_id
        WHERE b.id = ?
        `,
      )
      .get(req.authUser!.id, bookingId) as
      | {
          id: number;
          listingId: number;
          renterId: number;
          ownerId: number;
          status: BookingStatus;
          listingTitle: string;
          alreadyReviewed: number;
        }
      | undefined;

    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }

    const eligibility = canReviewBooking({
      status: booking.status,
      isRenter: booking.renterId === req.authUser!.id,
      alreadyReviewed: Boolean(booking.alreadyReviewed),
    });

    if (!eligibility.allowed) {
      const code = booking.renterId !== req.authUser!.id ? 403 : booking.alreadyReviewed ? 409 : 400;
      res.status(code).json({ error: eligibility.reason });
      return;
    }

    const reviewTx = db.transaction(() => {
      const result = db
        .prepare(
          `
          INSERT INTO reviews (booking_id, listing_id, reviewer_id, reviewee_id, rating, comment)
          VALUES (?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          booking.id,
          booking.listingId,
          req.authUser!.id,
          booking.ownerId,
          rating,
          comment,
        );

      db.prepare(
        'INSERT INTO notifications (user_id, title, body, is_read) VALUES (?, ?, ?, 0)',
      ).run(
        booking.ownerId,
        'New renter review received',
        `${req.authUser!.name} left a ${rating}-star review on ${booking.listingTitle}.`,
      );

      return Number(result.lastInsertRowid);
    });

    const reviewId = reviewTx();
    res.status(201).json({ id: reviewId, ok: true });
  });

  // --- Notifications ---
  router.get('/notifications', requireAuth, (req, res) => {
    const db = getDatabase();
    const rows = db
      .prepare(
        `
        SELECT id, title, body, is_read AS isRead, created_at AS createdAt
        FROM notifications
        WHERE user_id = ?
        ORDER BY id DESC
        LIMIT 25
        `,
      )
      .all(req.authUser!.id) as Array<{
      id: number;
      title: string;
      body: string;
      isRead: number;
      createdAt: string;
    }>;

    const notifications = rows.map((row) => ({
      ...row,
      isRead: Boolean(row.isRead),
    }));

    res.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
    });
  });

  router.patch('/notifications/:id/read', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid notification ID.' });
      return;
    }

    const db = getDatabase();
    const row = db
      .prepare('SELECT id, user_id AS userId FROM notifications WHERE id = ?')
      .get(id) as { id: number; userId: number } | undefined;

    if (!row) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }

    if (row.userId !== req.authUser!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  router.post('/notifications/read-all', requireAuth, (req, res) => {
    const db = getDatabase();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(
      req.authUser!.id,
    );
    res.json({ ok: true });
  });

  // --- Owner Dashboard Overview & Simulated Featured Promotion ---
  router.get('/dashboard/overview', requireAuth, (req, res) => {
    const db = getDatabase();
    const userId = req.authUser!.id;

    const listingStats = db
      .prepare(
        `
        SELECT
          COUNT(*) AS totalListings,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeListings,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingListings,
          SUM(CASE WHEN is_featured = 1 AND status = 'active' THEN 1 ELSE 0 END) AS activePromotionsCount
        FROM listings
        WHERE owner_id = ? AND status != 'archived'
        `,
      )
      .get(userId) as {
      totalListings: number;
      activeListings: number | null;
      pendingListings: number | null;
      activePromotionsCount: number | null;
    };

    const bookingStats = db
      .prepare(
        `
        SELECT
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingRequestsReceived,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approvedUpcoming,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedRentals,
          COALESCE(SUM(CASE WHEN status IN ('approved', 'completed') AND payment_status = 'paid_demo' THEN rental_total ELSE 0 END), 0) AS totalEarnedDemo
        FROM bookings
        WHERE owner_id = ?
        `,
      )
      .get(userId) as {
      pendingRequestsReceived: number | null;
      approvedUpcoming: number | null;
      completedRentals: number | null;
      totalEarnedDemo: number | null;
    };

    const unreadNotifications = (
      db
        .prepare('SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0')
        .get(userId) as { count: number }
    ).count;

    res.json({
      overview: {
        totalListings: listingStats.totalListings ?? 0,
        activeListings: listingStats.activeListings ?? 0,
        pendingListings: listingStats.pendingListings ?? 0,
        pendingRequestsReceived: bookingStats.pendingRequestsReceived ?? 0,
        approvedUpcoming: bookingStats.approvedUpcoming ?? 0,
        completedRentals: bookingStats.completedRentals ?? 0,
        totalEarnedDemo: bookingStats.totalEarnedDemo ?? 0,
        unreadNotifications,
        activePromotionsCount: listingStats.activePromotionsCount ?? 0,
      },
    });
  });

  router.post('/items/:id/promote-demo', requireAuth, (req, res) => {
    const listingId = Number(req.params.id);
    if (!Number.isInteger(listingId) || listingId <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    const parsed = promoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Select a valid demo promotion plan.' });
      return;
    }

    const db = getDatabase();
    const listing = db
      .prepare('SELECT id, owner_id AS ownerId, status FROM listings WHERE id = ?')
      .get(listingId) as { id: number; ownerId: number; status: string } | undefined;

    if (!listing || listing.status === 'archived') {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    if (listing.ownerId !== req.authUser!.id && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only promote your own listings.' });
      return;
    }

    if (listing.status !== 'active') {
      res.status(400).json({
        error: 'Only active listings can be placed in the Featured demo spotlight.',
      });
      return;
    }

    const days = parsed.data.planName.startsWith('7-Day') ? 7 : 30;
    const startAt = addDaysIso(0);
    const endAt = addDaysIso(days);

    const promoTx = db.transaction(() => {
      db.prepare('UPDATE listings SET is_featured = 1, featured_until = ? WHERE id = ?').run(
        endAt,
        listingId,
      );
      db.prepare(
        "INSERT INTO demo_promotions (listing_id, plan_name, start_at, end_at, status) VALUES (?, ?, ?, ?, 'active')",
      ).run(listingId, parsed.data.planName, startAt, endAt);
    });

    promoTx();
    res.json({ ok: true, listingId, isFeatured: true, featuredUntil: endAt });
  });

  return router;
}
