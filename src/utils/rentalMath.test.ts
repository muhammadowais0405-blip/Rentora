import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBrowseSearchParams,
  calculateBookingEstimate,
  calculateRentalDays,
  formatPkr,
  hasDateOverlap,
} from './rentalMath';

test('formatPkr formats integer amounts in PKR cleanly', () => {
  assert.equal(formatPkr(2500), 'Rs. 2,500');
  assert.equal(formatPkr(0), 'Rs. 0');
  assert.equal(formatPkr(-150), 'Rs. 0');
});

test('calculateRentalDays enforces end date after start date', () => {
  assert.deepEqual(calculateRentalDays('2026-12-01', '2026-12-04'), {
    valid: true,
    days: 3,
  });

  const sameDay = calculateRentalDays('2026-12-01', '2026-12-01');
  assert.equal(sameDay.valid, false);
  assert.equal(sameDay.days, 0);

  const reversed = calculateRentalDays('2026-12-05', '2026-12-02');
  assert.equal(reversed.valid, false);

  const badCalendar = calculateRentalDays('2026-02-30', '2026-03-02');
  assert.equal(badCalendar.valid, false);
});

test('hasDateOverlap detects intersecting half-open booking ranges and allows back-to-back turnaround', () => {
  const booked = [{ startDate: '2026-12-10', endDate: '2026-12-13' }];
  assert.equal(hasDateOverlap('2026-12-11', '2026-12-12', booked), true);
  assert.equal(hasDateOverlap('2026-12-08', '2026-12-11', booked), true);
  assert.equal(hasDateOverlap('2026-12-07', '2026-12-10', booked), false);
  assert.equal(hasDateOverlap('2026-12-13', '2026-12-15', booked), false);
});

test('calculateBookingEstimate keeps deposit separate from rentalTotal and flags overlaps', () => {
  const validEstimate = calculateBookingEstimate(
    2500,
    10000,
    '2026-12-01',
    '2026-12-04',
    [{ startDate: '2026-12-10', endDate: '2026-12-13' }],
  );
  assert.equal(validEstimate.valid, true);
  assert.equal(validEstimate.days, 3);
  assert.equal(validEstimate.rentalTotal, 7500);
  assert.equal(validEstimate.depositAmount, 10000);
  assert.equal(validEstimate.hasOverlap, false);

  const overlappingEstimate = calculateBookingEstimate(
    2500,
    10000,
    '2026-12-11',
    '2026-12-14',
    [{ startDate: '2026-12-10', endDate: '2026-12-13' }],
  );
  assert.equal(overlappingEstimate.valid, false);
  assert.equal(overlappingEstimate.hasOverlap, true);
});

test('buildBrowseSearchParams omits empty values and default recommended sort', () => {
  const params = buildBrowseSearchParams({
    q: '  camera ',
    category: 'cameras-photography',
    maxPrice: '3000',
    sort: 'recommended',
  });
  assert.equal(params.toString(), 'q=camera&category=cameras-photography&maxPrice=3000');

  const sorted = buildBrowseSearchParams({ sort: 'price_asc' });
  assert.equal(sorted.toString(), 'sort=price_asc');
});
