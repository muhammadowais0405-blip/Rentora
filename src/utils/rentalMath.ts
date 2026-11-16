import type { BookedRange, BrowseFilters } from '../types/marketplace';

export interface RentalDaysResult {
  valid: boolean;
  days: number;
  error?: string;
}

export interface BookingEstimate {
  valid: boolean;
  days: number;
  dailyPrice: number;
  rentalTotal: number;
  depositAmount: number;
  hasOverlap: boolean;
  error?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseUtcDate(dateStr: string): Date | null {
  if (!ISO_DATE_RE.test(dateStr)) {
    return null;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return null;
  }
  return utc;
}

export function formatPkr(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : 0;
  return `Rs. ${safe.toLocaleString('en-PK')}`;
}

export function calculateRentalDays(startDate: string, endDate: string): RentalDaysResult {
  if (!startDate || !endDate) {
    return { valid: false, days: 0, error: 'Select both pickup and return dates.' };
  }

  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);

  if (!start || !end) {
    return { valid: false, days: 0, error: 'Enter valid calendar dates.' };
  }

  const diffMs = end.getTime() - start.getTime();
  const days = Math.round(diffMs / 86_400_000);

  if (days < 1) {
    return {
      valid: false,
      days: 0,
      error: 'Return date must be at least 1 day after pickup date.',
    };
  }

  if (days > 90) {
    return {
      valid: false,
      days: 0,
      error: 'Demo rentals support up to 90 days per request.',
    };
  }

  return { valid: true, days };
}

export function hasDateOverlap(
  startDate: string,
  endDate: string,
  bookedRanges: BookedRange[],
): boolean {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);
  if (!start || !end || end.getTime() <= start.getTime()) {
    return false;
  }

  const reqStart = start.getTime();
  const reqEnd = end.getTime();

  return bookedRanges.some((range) => {
    const bStart = parseUtcDate(range.startDate)?.getTime();
    const bEnd = parseUtcDate(range.endDate)?.getTime();
    if (bStart === undefined || bEnd === undefined) {
      return false;
    }
    // Half-open overlap check: [reqStart, reqEnd) overlaps [bStart, bEnd)
    return reqStart < bEnd && reqEnd > bStart;
  });
}

export function calculateBookingEstimate(
  dailyPrice: number,
  depositAmount: number,
  startDate: string,
  endDate: string,
  bookedRanges: BookedRange[] = [],
): BookingEstimate {
  const daysCheck = calculateRentalDays(startDate, endDate);
  if (!daysCheck.valid) {
    return {
      valid: false,
      days: 0,
      dailyPrice,
      rentalTotal: 0,
      depositAmount,
      hasOverlap: false,
      error: daysCheck.error,
    };
  }

  const overlap = hasDateOverlap(startDate, endDate, bookedRanges);
  const rentalTotal = dailyPrice * daysCheck.days;

  if (overlap) {
    return {
      valid: false,
      days: daysCheck.days,
      dailyPrice,
      rentalTotal,
      depositAmount,
      hasOverlap: true,
      error: 'Selected dates overlap an approved demo booking. Choose different dates.',
    };
  }

  return {
    valid: true,
    days: daysCheck.days,
    dailyPrice,
    rentalTotal,
    depositAmount,
    hasOverlap: false,
  };
}

export function getDefaultRentalDates(referenceDate = new Date()): {
  startDate: string;
  endDate: string;
} {
  const base = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );
  const start = new Date(base + 2 * 86_400_000);
  const end = new Date(base + 5 * 86_400_000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export function buildBrowseSearchParams(filters: Partial<BrowseFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  if (filters.category?.trim()) params.set('category', filters.category.trim());
  if (filters.subcategory?.trim()) params.set('subcategory', filters.subcategory.trim());
  if (filters.minPrice?.trim()) params.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice?.trim()) params.set('maxPrice', filters.maxPrice.trim());
  if (filters.sort && filters.sort !== 'recommended') params.set('sort', filters.sort);
  return params;
}
