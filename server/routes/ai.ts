import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { getDatabase } from '../db/database';
import { requireAuth } from '../middleware/auth';
import { generateAiListingDraft, parseAiRentalQuery } from '../services/aiService';
import { rankMatchingListings } from '../../src/utils/aiHelpers';
import type { ListingSummary } from '../../src/types/marketplace';

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const draftBodySchema = z.object({
  ownerNotes: z.string().max(600).optional().default(''),
  existingImagePath: z.string().max(300).optional(),
});

const rentalSearchSchema = z.object({
  query: z.string().trim().min(3, 'Describe what you want to rent (at least 3 characters).').max(400),
});

export function createAiRouter(): Router {
  const router = Router();

  router.post('/listing-draft', requireAuth, uploadMemory.single('image'), async (req, res) => {
    const parsedBody = draftBodySchema.safeParse(req.body ?? {});
    if (!parsedBody.success) {
      res.status(400).json({ error: 'Invalid notes input.' });
      return;
    }

    let imageBase64: string | undefined;
    let mimeType: string | undefined;

    if (req.file) {
      const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
      if (!allowed.has(req.file.mimetype)) {
        res.status(400).json({ error: 'Only JPG, PNG, or WEBP images are supported.' });
        return;
      }
      imageBase64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (parsedBody.data.existingImagePath) {
      const rel = parsedBody.data.existingImagePath;
      if (rel.startsWith('/uploads/')) {
        const filename = path.basename(rel);
        const absPath = path.resolve(process.cwd(), 'server', 'uploads', filename);
        if (fs.existsSync(absPath)) {
          const buf = fs.readFileSync(absPath);
          imageBase64 = buf.toString('base64');
          const ext = path.extname(filename).toLowerCase();
          mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        }
      }
    }

    if (!imageBase64 && !parsedBody.data.ownerNotes.trim()) {
      res.status(400).json({
        error: 'Upload a photo or enter brief item notes before generating an AI draft.',
      });
      return;
    }

    try {
      const draft = await generateAiListingDraft({
        imageBase64,
        mimeType,
        ownerNotes: parsedBody.data.ownerNotes,
      });
      res.json({ draft });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to generate AI draft right now.';
      res.status(503).json({ error: message });
    }
  });

  router.post('/rental-search', async (req, res) => {
    const parsed = rentalSearchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Enter a search request.' });
      return;
    }

    try {
      const { filters, usedFallback, notice } = await parseAiRentalQuery(parsed.data.query);
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
          WHERE l.status = 'active'
          GROUP BY l.id
          `,
        )
        .all() as Array<
        Omit<ListingSummary, 'isFeatured' | 'coverImage' | 'rating'> & {
          description: string;
          isFeatured: number;
          coverImage: string | null;
          rating: number | null;
        }
      >;

      const normalizedRows = rows.map((row) => ({
        ...row,
        isFeatured: Boolean(row.isFeatured),
        coverImage: row.coverImage ?? '',
        rating: row.rating ?? 4.8,
      }));

      const matches = rankMatchingListings(normalizedRows, filters);

      res.json({
        filters,
        matches,
        usedFallback,
        notice,
      });
    } catch (error) {
      console.error('AI rental search failed:', error);
      res.status(500).json({ error: 'Unable to search rentals right now.' });
    }
  });

  return router;
}
