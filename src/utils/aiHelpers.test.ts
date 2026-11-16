import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aiListingDraftSchema,
  aiSearchFiltersSchema,
  extractFallbackSearchFilters,
  rankMatchingListings,
} from './aiHelpers';
import type { ListingSummary } from '../types/marketplace';

const SAMPLE_LISTINGS: Array<ListingSummary & { description?: string }> = [
  {
    id: 1,
    ownerId: 1,
    ownerName: 'Ahmed Khan',
    categoryId: 1,
    categoryName: 'Cameras & Photography',
    categorySlug: 'cameras-photography',
    subcategory: 'Mirrorless',
    title: 'Sony A7 III Full-Frame Kit',
    condition: 'Like New',
    dailyPrice: 2500,
    depositAmount: 12000,
    locationText: 'Gulberg III, Lahore',
    status: 'active',
    isFeatured: true,
    coverImage: '/src/assets/images/item_sony_camera_1794844411004.jpg',
    rating: 5.0,
    reviewCount: 2,
    createdAt: '2026-01-01',
    description: 'Mirrorless full-frame camera for university film and portrait assignments.',
  },
  {
    id: 4,
    ownerId: 1,
    ownerName: 'Ahmed Khan',
    categoryId: 2,
    categoryName: 'Gaming Consoles',
    categorySlug: 'gaming-consoles',
    subcategory: 'PlayStation',
    title: 'PlayStation 5 Disc Edition + 2 Controllers',
    condition: 'Like New',
    dailyPrice: 3000,
    depositAmount: 15000,
    locationText: 'Johar Town, Lahore',
    status: 'active',
    isFeatured: true,
    coverImage: '/src/assets/images/item_ps5_console_1794844413476.jpg',
    rating: 5.0,
    reviewCount: 1,
    createdAt: '2026-01-01',
  },
];

test('aiListingDraftSchema validates structured AI draft and rejects invalid category', () => {
  const valid = aiListingDraftSchema.safeParse({
    suggestedTitle: 'Compact Mirrorless Camera Kit',
    suggestedDescription: 'Clean mirrorless camera body with standard zoom lens visible in photo.',
    suggestedCategorySlug: 'cameras-photography',
    suggestedSubcategory: 'Mirrorless',
    suggestedTags: ['mirrorless', 'camera'],
    visibleAttributes: ['Black body', 'Standard zoom lens'],
  });
  assert.equal(valid.success, true);

  const badCategory = aiListingDraftSchema.safeParse({
    suggestedTitle: 'Drone',
    suggestedDescription: 'A drone with 4K camera.',
    suggestedCategorySlug: 'drones',
    suggestedSubcategory: 'Aerial',
    suggestedTags: [],
    visibleAttributes: [],
  });
  assert.equal(badCategory.success, false);
});

test('extractFallbackSearchFilters parses category, PKR ceiling, and duration', () => {
  const filters = extractFallbackSearchFilters(
    'I need a camera for a university photography assignment for two days, under Rs. 2,500 per day',
  );
  assert.equal(filters.categorySlug, 'cameras-photography');
  assert.equal(filters.maxDailyPrice, 2500);
  assert.equal(filters.requestedDays, 2);
  assert.equal(aiSearchFiltersSchema.safeParse(filters).success, true);
});

test('rankMatchingListings filters out over-budget or wrong-category items and computes duration estimate', () => {
  const matches = rankMatchingListings(SAMPLE_LISTINGS, {
    categorySlug: 'cameras-photography',
    maxDailyPrice: 2500,
    minDailyPrice: null,
    keywords: ['mirrorless', 'camera'],
    requestedDays: 2,
    summary: 'Cameras under Rs. 2,500/day for 2 days',
  });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].item.id, 1);
  assert.equal(matches[0].estimatedTotal, 5000);
  assert.match(matches[0].reason, /2-day est: Rs\. 5,000/);
});
