import { z } from 'zod';
import type {
  AiRentalMatch,
  AiSearchFilters,
  ListingSummary,
} from '../types/marketplace';
import { formatPkr } from './rentalMath';

export const ALLOWED_CATEGORY_SLUGS = [
  'cameras-photography',
  'gaming-consoles',
  'bikes-cycles',
  'electronics-equipment',
] as const;

export const aiListingDraftSchema = z.object({
  suggestedTitle: z.string().min(3).max(90),
  suggestedDescription: z.string().min(15).max(800),
  suggestedCategorySlug: z.enum(ALLOWED_CATEGORY_SLUGS),
  suggestedSubcategory: z.string().min(1).max(60),
  suggestedTags: z.array(z.string().min(1).max(32)).max(6),
  visibleAttributes: z.array(z.string().min(1).max(80)).max(6),
});

export const aiSearchFiltersSchema = z.object({
  categorySlug: z.enum(ALLOWED_CATEGORY_SLUGS).nullable(),
  maxDailyPrice: z.number().int().positive().max(100000).nullable(),
  minDailyPrice: z.number().int().nonnegative().max(100000).nullable(),
  keywords: z.array(z.string().min(1).max(40)).max(8),
  requestedDays: z.number().int().min(1).max(90).nullable(),
  summary: z.string().min(3).max(220),
});

const CATEGORY_KEYWORD_MAP: Array<{ slug: (typeof ALLOWED_CATEGORY_SLUGS)[number]; terms: string[] }> = [
  {
    slug: 'cameras-photography',
    terms: ['camera', 'dslr', 'mirrorless', 'lens', 'sony', 'canon', 'gopro', 'photography', 'film', 'shoot', 'video'],
  },
  {
    slug: 'gaming-consoles',
    terms: ['console', 'ps5', 'playstation', 'xbox', 'controller', 'gaming', 'fifa', 'vr'],
  },
  {
    slug: 'bikes-cycles',
    terms: ['bike', 'bicycle', 'cycle', 'road', 'mountain', 'mtb', 'trail', 'cycling'],
  },
  {
    slug: 'electronics-equipment',
    terms: ['projector', 'laptop', 'ultrabook', 'macbook', 'speaker', 'mic', 'presentation', 'electronics', 'xgimi'],
  },
];

export function extractFallbackSearchFilters(query: string): AiSearchFilters {
  const normalized = query.toLowerCase();

  let categorySlug: AiSearchFilters['categorySlug'] = null;
  for (const entry of CATEGORY_KEYWORD_MAP) {
    if (entry.terms.some((term) => normalized.includes(term))) {
      categorySlug = entry.slug;
      break;
    }
  }

  let maxDailyPrice: number | null = null;
  const priceMatch = normalized.match(/(?:under|below|max|less than|upto|up to|rs\.?|pkr)\s*([\d,]+)/i);
  if (priceMatch?.[1]) {
    const parsed = Number(priceMatch[1].replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      maxDailyPrice = Math.round(parsed);
    }
  }

  let requestedDays: number | null = null;
  const daysMatch = normalized.match(/(\d+|one|two|three|four|five|six|seven)\s*days?/i);
  if (daysMatch?.[1]) {
    const wordMap: Record<string, number> = {
      one: 1,
      two: 2,
      three: 3,
      four: 4,
      five: 5,
      six: 6,
      seven: 7,
    };
    const token = daysMatch[1].toLowerCase();
    requestedDays = wordMap[token] ?? (Number(token) || null);
  } else if (normalized.includes('weekend')) {
    requestedDays = 2;
  }

  const stopWords = new Set([
    'need', 'want', 'looking', 'for', 'rent', 'rental', 'under', 'below', 'preferably',
    'days', 'day', 'pkr', 'per', 'with', 'from', 'the', 'and', 'university', 'assignment',
    'project', 'short', 'around', 'about', 'item', 'gear', 'some', 'good',
  ]);

  const keywords = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w) && !/^\d+$/.test(w))
    .slice(0, 6);

  return {
    categorySlug,
    maxDailyPrice,
    minDailyPrice: null,
    keywords,
    requestedDays,
    summary: 'Matched using local keyword and budget rules.',
  };
}

export function rankMatchingListings(
  candidates: Array<ListingSummary & { description?: string }>,
  filters: AiSearchFilters,
): AiRentalMatch[] {
  const results: AiRentalMatch[] = [];

  for (const candidate of candidates) {
    if (filters.categorySlug && candidate.categorySlug !== filters.categorySlug) {
      continue;
    }
    if (filters.maxDailyPrice !== null && candidate.dailyPrice > filters.maxDailyPrice) {
      continue;
    }
    if (filters.minDailyPrice !== null && candidate.dailyPrice < filters.minDailyPrice) {
      continue;
    }

    let score = 10;
    const haystack = `${candidate.title} ${candidate.subcategory} ${candidate.locationText} ${candidate.description ?? ''}`.toLowerCase();
    const matchedKeywords: string[] = [];

    for (const kw of filters.keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        score += 15;
        matchedKeywords.push(kw);
      }
    }

    if (candidate.isFeatured) {
      score += 4;
    }
    score += candidate.rating;

    const reasons: string[] = [candidate.categoryName];
    if (filters.maxDailyPrice !== null) {
      reasons.push(`Within ${formatPkr(filters.maxDailyPrice)}/day budget`);
    } else {
      reasons.push(`${formatPkr(candidate.dailyPrice)}/day`);
    }

    if (matchedKeywords.length > 0) {
      reasons.push(`Matches "${matchedKeywords.slice(0, 2).join(', ')}"`);
    }

    const estimatedTotal =
      filters.requestedDays !== null ? candidate.dailyPrice * filters.requestedDays : null;

    if (estimatedTotal !== null && filters.requestedDays !== null) {
      reasons.push(`${filters.requestedDays}-day est: ${formatPkr(estimatedTotal)}`);
    }

    // Strip optional description before returning summary shape
    const { description: _desc, ...itemSummary } = candidate;
    results.push({
      item: itemSummary,
      reason: reasons.join(' · '),
      estimatedTotal,
      score,
    });
  }

  return results.sort((a, b) => b.score - a.score || a.item.dailyPrice - b.item.dailyPrice);
}
