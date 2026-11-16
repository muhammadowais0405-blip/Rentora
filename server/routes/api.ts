import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import { requireAuth } from '../middleware/auth';
import { ALLOWED_CATEGORY_SLUGS } from '../../src/utils/aiHelpers';

const uploadsDir = path.resolve(process.cwd(), 'server', 'uploads');

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext =
      file.mimetype === 'image/png'
        ? '.png'
        : file.mimetype === 'image/webp'
          ? '.webp'
          : '.jpg';
    cb(null, `rentora-${crypto.randomUUID()}${ext}`);
  },
});

const uploadMiddleware = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      cb(new Error('Only JPG, PNG, or WEBP images up to 5 MB are allowed.'));
      return;
    }
    cb(null, true);
  },
});

const itemsQuerySchema = z.object({
  q: z.string().max(120).optional(),
  category: z.string().max(80).optional(),
  subcategory: z.string().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z
    .enum(['recommended', 'price_asc', 'price_desc', 'rating_desc'])
    .optional()
    .default('recommended'),
  featured: z.string().optional(),
});

const listingWriteSchema = z.object({
  title: z.string().trim().min(4, 'Title must be at least 4 characters.').max(90),
  categorySlug: z.enum(ALLOWED_CATEGORY_SLUGS),
  subcategory: z.string().trim().min(1).max(60),
  description: z.string().trim().min(15, 'Description must be at least 15 characters.').max(1500),
  condition: z.enum(['Like New', 'Excellent', 'Good']),
  dailyPrice: z.coerce.number().int().min(100, 'Daily price must be at least Rs. 100.').max(100000),
  depositAmount: z.coerce.number().int().min(0).max(500000),
  locationText: z.string().trim().min(3, 'Enter a pickup neighborhood or city.').max(120),
  specs: z.record(z.string(), z.string()).optional().default({}),
  images: z
    .array(
      z.object({
        filePath: z.string().min(1).max(300),
        isCover: z.boolean(),
      }),
    )
    .min(1, 'Upload at least one photo for your listing.')
    .max(5),
});

interface ListingRow {
  id: number;
  ownerId: number;
  ownerName: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  subcategory: string;
  title: string;
  description: string;
  condition: string;
  dailyPrice: number;
  depositAmount: number;
  locationText: string;
  specsJson: string;
  status: string;
  isFeatured: number;
  coverImage: string | null;
  rating: number | null;
  reviewCount: number;
  createdAt: string;
}

export function createApiRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    try {
      const db = getDatabase();
      const row = db
        .prepare("SELECT COUNT(*) AS count FROM listings WHERE status = 'active'")
        .get() as { count: number };
      res.json({
        ok: true,
        service: 'rentora-api',
        database: 'sqlite',
        activeListings: row.count,
      });
    } catch (error) {
      console.error('Health check failed:', error);
      res.status(500).json({ ok: false, error: 'Database unavailable' });
    }
  });

  router.get('/categories', (_req, res) => {
    try {
      const db = getDatabase();
      const rows = db
        .prepare(
          `
          SELECT
            c.id,
            c.name,
            c.slug,
            c.description,
            c.image_path AS imagePath,
            c.subcategories_json AS subcategoriesJson,
            COUNT(l.id) AS listingCount
          FROM categories c
          LEFT JOIN listings l ON l.category_id = c.id AND l.status = 'active'
          GROUP BY c.id
          ORDER BY c.id ASC
          `,
        )
        .all() as Array<{
        id: number;
        name: string;
        slug: string;
        description: string;
        imagePath: string;
        subcategoriesJson: string;
        listingCount: number;
      }>;

      const categories = rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        imagePath: row.imagePath,
        listingCount: row.listingCount,
        subcategories: JSON.parse(row.subcategoriesJson) as string[],
      }));

      res.json({ categories });
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      res.status(500).json({ error: 'Unable to load categories right now.' });
    }
  });

  router.post('/upload', requireAuth, (req, res) => {
    uploadMiddleware.single('image')(req, res, (err) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Image upload failed.';
        res.status(400).json({ error: message });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'Please select an image file.' });
        return;
      }
      res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
    });
  });

  router.get('/my-listings', requireAuth, (req, res) => {
    try {
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
            l.description,
            l.condition,
            l.daily_price AS dailyPrice,
            l.deposit_amount AS depositAmount,
            l.location_text AS locationText,
            l.specs_json AS specsJson,
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
          FROM listings l
          JOIN users u ON u.id = l.owner_id
          JOIN categories c ON c.id = l.category_id
          LEFT JOIN reviews r ON r.listing_id = l.id
          WHERE l.owner_id = ? AND l.status != 'archived'
          GROUP BY l.id
          ORDER BY l.id DESC
          `,
        )
        .all(req.authUser!.id) as ListingRow[];

      const items = rows.map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categorySlug: row.categorySlug,
        subcategory: row.subcategory,
        title: row.title,
        condition: row.condition,
        dailyPrice: row.dailyPrice,
        depositAmount: row.depositAmount,
        locationText: row.locationText,
        status: row.status,
        isFeatured: Boolean(row.isFeatured),
        coverImage: row.coverImage ?? '',
        rating: row.rating ?? 4.8,
        reviewCount: row.reviewCount,
        createdAt: row.createdAt,
      }));

      res.json({ items });
    } catch (error) {
      console.error('Failed to load owner listings:', error);
      res.status(500).json({ error: 'Unable to load your listings.' });
    }
  });

  router.get('/items', (req, res) => {
    const parsed = itemsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid search or filter parameters.' });
      return;
    }

    const { q, category, subcategory, minPrice, maxPrice, sort, featured } = parsed.data;

    try {
      const db = getDatabase();
      const conditions: string[] = ["l.status = 'active'"];
      const params: Array<string | number> = [];

      if (q && q.trim().length > 0) {
        const pattern = `%${q.trim().toLowerCase()}%`;
        conditions.push(
          '(LOWER(l.title) LIKE ? OR LOWER(l.description) LIKE ? OR LOWER(l.location_text) LIKE ? OR LOWER(l.subcategory) LIKE ?)',
        );
        params.push(pattern, pattern, pattern, pattern);
      }

      if (category && category.trim().length > 0) {
        conditions.push('c.slug = ?');
        params.push(category.trim());
      }

      if (subcategory && subcategory.trim().length > 0) {
        conditions.push('LOWER(l.subcategory) = LOWER(?)');
        params.push(subcategory.trim());
      }

      if (typeof minPrice === 'number') {
        conditions.push('l.daily_price >= ?');
        params.push(minPrice);
      }

      if (typeof maxPrice === 'number') {
        conditions.push('l.daily_price <= ?');
        params.push(maxPrice);
      }

      if (featured === '1' || featured === 'true') {
        conditions.push('l.is_featured = 1');
      }

      let orderBy = 'l.is_featured DESC, COALESCE(AVG(r.rating), 4.8) DESC, l.id ASC';
      if (sort === 'price_asc') {
        orderBy = 'l.daily_price ASC, l.id ASC';
      } else if (sort === 'price_desc') {
        orderBy = 'l.daily_price DESC, l.id ASC';
      } else if (sort === 'rating_desc') {
        orderBy = 'COALESCE(AVG(r.rating), 4.8) DESC, COUNT(r.id) DESC, l.id ASC';
      }

      const sql = `
        SELECT
          l.id,
          l.owner_id AS ownerId,
          u.name AS ownerName,
          l.category_id AS categoryId,
          c.name AS categoryName,
          c.slug AS categorySlug,
          l.subcategory,
          l.title,
          l.description,
          l.condition,
          l.daily_price AS dailyPrice,
          l.deposit_amount AS depositAmount,
          l.location_text AS locationText,
          l.specs_json AS specsJson,
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
        FROM listings l
        JOIN users u ON u.id = l.owner_id
        JOIN categories c ON c.id = l.category_id
        LEFT JOIN reviews r ON r.listing_id = l.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY l.id
        ORDER BY ${orderBy}
      `;

      const rows = db.prepare(sql).all(...params) as ListingRow[];
      const items = rows.map((row) => ({
        id: row.id,
        ownerId: row.ownerId,
        ownerName: row.ownerName,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        categorySlug: row.categorySlug,
        subcategory: row.subcategory,
        title: row.title,
        condition: row.condition,
        dailyPrice: row.dailyPrice,
        depositAmount: row.depositAmount,
        locationText: row.locationText,
        status: row.status,
        isFeatured: Boolean(row.isFeatured),
        coverImage: row.coverImage ?? '',
        rating: row.rating ?? 4.8,
        reviewCount: row.reviewCount,
        createdAt: row.createdAt,
      }));

      res.json({ items, total: items.length });
    } catch (error) {
      console.error('Failed to query items:', error);
      res.status(500).json({ error: 'Unable to load rental listings.' });
    }
  });

  router.post('/items', requireAuth, (req, res) => {
    const parsed = listingWriteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Please check all required listing fields.',
      });
      return;
    }

    const db = getDatabase();
    const cat = db
      .prepare('SELECT id FROM categories WHERE slug = ?')
      .get(parsed.data.categorySlug) as { id: number } | undefined;

    if (!cat) {
      res.status(400).json({ error: 'Selected category was not found.' });
      return;
    }

    const createTx = db.transaction(() => {
      const insertResult = db
        .prepare(
          `
          INSERT INTO listings (
            owner_id, category_id, subcategory, title, description, condition,
            daily_price, deposit_amount, location_text, specs_json, status, is_featured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)
          `,
        )
        .run(
          req.authUser!.id,
          cat.id,
          parsed.data.subcategory,
          parsed.data.title,
          parsed.data.description,
          parsed.data.condition,
          parsed.data.dailyPrice,
          parsed.data.depositAmount,
          parsed.data.locationText,
          JSON.stringify(parsed.data.specs ?? {}),
        );

      const listingId = Number(insertResult.lastInsertRowid);
      const insertImg = db.prepare(
        `
        INSERT INTO listing_images (listing_id, file_path, is_cover, sort_order)
        VALUES (?, ?, ?, ?)
        `,
      );

      let hasCover = parsed.data.images.some((img) => img.isCover);
      parsed.data.images.forEach((img, index) => {
        const isCover = hasCover ? img.isCover : index === 0;
        if (isCover) hasCover = true;
        insertImg.run(listingId, img.filePath, isCover ? 1 : 0, index);
      });

      return listingId;
    });

    const listingId = createTx();
    res.status(201).json({ id: listingId, status: 'pending' });
  });

  router.put('/items/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    const db = getDatabase();
    const existing = db
      .prepare('SELECT id, owner_id AS ownerId, status FROM listings WHERE id = ?')
      .get(id) as { id: number; ownerId: number; status: string } | undefined;

    if (!existing || existing.status === 'archived') {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    if (existing.ownerId !== req.authUser!.id && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only edit your own listings.' });
      return;
    }

    const parsed = listingWriteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message ?? 'Invalid listing details.',
      });
      return;
    }

    const cat = db
      .prepare('SELECT id FROM categories WHERE slug = ?')
      .get(parsed.data.categorySlug) as { id: number } | undefined;

    if (!cat) {
      res.status(400).json({ error: 'Selected category was not found.' });
      return;
    }

    const updateTx = db.transaction(() => {
      db.prepare(
        `
        UPDATE listings
        SET category_id = ?, subcategory = ?, title = ?, description = ?,
            condition = ?, daily_price = ?, deposit_amount = ?, location_text = ?, specs_json = ?
        WHERE id = ?
        `,
      ).run(
        cat.id,
        parsed.data.subcategory,
        parsed.data.title,
        parsed.data.description,
        parsed.data.condition,
        parsed.data.dailyPrice,
        parsed.data.depositAmount,
        parsed.data.locationText,
        JSON.stringify(parsed.data.specs ?? {}),
        id,
      );

      db.prepare('DELETE FROM listing_images WHERE listing_id = ?').run(id);
      const insertImg = db.prepare(
        `
        INSERT INTO listing_images (listing_id, file_path, is_cover, sort_order)
        VALUES (?, ?, ?, ?)
        `,
      );
      let hasCover = parsed.data.images.some((img) => img.isCover);
      parsed.data.images.forEach((img, index) => {
        const isCover = hasCover ? img.isCover : index === 0;
        if (isCover) hasCover = true;
        insertImg.run(id, img.filePath, isCover ? 1 : 0, index);
      });
    });

    updateTx();
    res.json({ id, ok: true });
  });

  router.delete('/items/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    const db = getDatabase();
    const existing = db
      .prepare('SELECT id, owner_id AS ownerId, status FROM listings WHERE id = ?')
      .get(id) as { id: number; ownerId: number; status: string } | undefined;

    if (!existing || existing.status === 'archived') {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }

    if (existing.ownerId !== req.authUser!.id && req.authUser!.role !== 'admin') {
      res.status(403).json({ error: 'You can only archive your own listings.' });
      return;
    }

    db.prepare("UPDATE listings SET status = 'archived' WHERE id = ?").run(id);
    res.json({ ok: true });
  });

  router.get('/items/:id', (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }

    try {
      const db = getDatabase();
      const row = db
        .prepare(
          `
          SELECT
            l.id,
            l.owner_id AS ownerId,
            u.name AS ownerName,
            u.email_verified_demo AS emailVerifiedDemo,
            u.phone_verified_demo AS phoneVerifiedDemo,
            u.created_at AS memberSince,
            l.category_id AS categoryId,
            c.name AS categoryName,
            c.slug AS categorySlug,
            l.subcategory,
            l.title,
            l.description,
            l.condition,
            l.daily_price AS dailyPrice,
            l.deposit_amount AS depositAmount,
            l.location_text AS locationText,
            l.specs_json AS specsJson,
            l.status,
            l.is_featured AS isFeatured,
            l.created_at AS createdAt
          FROM listings l
          JOIN users u ON u.id = l.owner_id
          JOIN categories c ON c.id = l.category_id
          WHERE l.id = ? AND l.status != 'archived'
          `,
        )
        .get(id) as
        | (ListingRow & {
            emailVerifiedDemo: number;
            phoneVerifiedDemo: number;
            memberSince: string;
          })
        | undefined;

      if (!row) {
        res.status(404).json({ error: 'Listing not found.' });
        return;
      }

      const isOwnerOrAdmin =
        req.authUser && (req.authUser.id === row.ownerId || req.authUser.role === 'admin');
      if (row.status !== 'active' && !isOwnerOrAdmin) {
        res.status(404).json({ error: 'Listing not found.' });
        return;
      }

      const images = db
        .prepare(
          `
          SELECT id, file_path AS filePath, is_cover AS isCover, sort_order AS sortOrder
          FROM listing_images
          WHERE listing_id = ?
          ORDER BY is_cover DESC, sort_order ASC
          `,
        )
        .all(id) as Array<{ id: number; filePath: string; isCover: number; sortOrder: number }>;

      const reviews = db
        .prepare(
          `
          SELECT r.id, u.name AS reviewerName, r.rating, r.comment, r.created_at AS createdAt
          FROM reviews r
          JOIN users u ON u.id = r.reviewer_id
          WHERE r.listing_id = ?
          ORDER BY r.id DESC
          `,
        )
        .all(id) as Array<{
        id: number;
        reviewerName: string;
        rating: number;
        comment: string;
        createdAt: string;
      }>;

      const bookedRanges = db
        .prepare(
          `
          SELECT start_date AS startDate, end_date AS endDate
          FROM bookings
          WHERE listing_id = ? AND status = 'approved'
          ORDER BY start_date ASC
          `,
        )
        .all(id) as Array<{ startDate: string; endDate: string }>;

      const ownerListingCount = (
        db
          .prepare("SELECT COUNT(*) AS count FROM listings WHERE owner_id = ? AND status = 'active'")
          .get(row.ownerId) as { count: number }
      ).count;

      const avgRating =
        reviews.length > 0
          ? Number(
              (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
            )
          : 4.8;

      res.json({
        item: {
          id: row.id,
          ownerId: row.ownerId,
          ownerName: row.ownerName,
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          categorySlug: row.categorySlug,
          subcategory: row.subcategory,
          title: row.title,
          description: row.description,
          condition: row.condition,
          dailyPrice: row.dailyPrice,
          depositAmount: row.depositAmount,
          locationText: row.locationText,
          specs: JSON.parse(row.specsJson || '{}') as Record<string, string>,
          status: row.status,
          isFeatured: Boolean(row.isFeatured),
          coverImage: images[0]?.filePath ?? '',
          rating: avgRating,
          reviewCount: reviews.length,
          createdAt: row.createdAt,
          images: images.map((img) => ({
            ...img,
            isCover: Boolean(img.isCover),
          })),
          owner: {
            id: row.ownerId,
            name: row.ownerName,
            emailVerifiedDemo: Boolean(row.emailVerifiedDemo),
            phoneVerifiedDemo: Boolean(row.phoneVerifiedDemo),
            memberSince: row.memberSince,
            totalListings: ownerListingCount,
          },
          reviews,
          bookedRanges,
        },
      });
    } catch (error) {
      console.error('Failed to load listing detail:', error);
      res.status(500).json({ error: 'Unable to load listing details.' });
    }
  });

  return router;
}
