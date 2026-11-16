import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canReviewBooking,
  canTransitionBookingStatus,
  getAllowedBookingActions,
} from './bookingRules';

test('owner can approve or decline pending requests but renter cannot', () => {
  assert.equal(
    canTransitionBookingStatus({
      currentStatus: 'pending',
      nextStatus: 'approved',
      isOwner: true,
      isRenter: false,
      isAdmin: false,
    }).allowed,
    true,
  );

  assert.equal(
    canTransitionBookingStatus({
      currentStatus: 'pending',
      nextStatus: 'approved',
      isOwner: false,
      isRenter: true,
      isAdmin: false,
    }).allowed,
    false,
  );
});

test('renter can cancel only while pending and cannot complete bookings', () => {
  assert.equal(
    canTransitionBookingStatus({
      currentStatus: 'pending',
      nextStatus: 'cancelled',
      isOwner: false,
      isRenter: true,
      isAdmin: false,
    }).allowed,
    true,
  );

  assert.equal(
    canTransitionBookingStatus({
      currentStatus: 'approved',
      nextStatus: 'cancelled',
      isOwner: false,
      isRenter: true,
      isAdmin: false,
    }).allowed,
    false,
  );

  assert.equal(
    canTransitionBookingStatus({
      currentStatus: 'approved',
      nextStatus: 'completed',
      isOwner: false,
      isRenter: true,
      isAdmin: false,
    }).allowed,
    false,
  );
});

test('allowed actions expose demo payment only on approved unpaid renter bookings', () => {
  const unpaidApproved = getAllowedBookingActions({
    status: 'approved',
    paymentStatus: 'unpaid',
    isOwner: false,
    isRenter: true,
    isAdmin: false,
    hasReviewed: false,
  });
  assert.equal(unpaidApproved.canConfirmDemoPayment, true);
  assert.equal(unpaidApproved.canLeaveReview, false);

  const paidApproved = getAllowedBookingActions({
    status: 'approved',
    paymentStatus: 'paid_demo',
    isOwner: false,
    isRenter: true,
    isAdmin: false,
    hasReviewed: false,
  });
  assert.equal(paidApproved.canConfirmDemoPayment, false);
});

test('reviews are strictly gated to completed bookings without prior review', () => {
  assert.equal(
    canReviewBooking({ status: 'approved', isRenter: true, alreadyReviewed: false }).allowed,
    false,
  );
  assert.equal(
    canReviewBooking({ status: 'completed', isRenter: false, alreadyReviewed: false }).allowed,
    false,
  );
  assert.equal(
    canReviewBooking({ status: 'completed', isRenter: true, alreadyReviewed: true }).allowed,
    false,
  );
  assert.equal(
    canReviewBooking({ status: 'completed', isRenter: true, alreadyReviewed: false }).allowed,
    true,
  );
});
