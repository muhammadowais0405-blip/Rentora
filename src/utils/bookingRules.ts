export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'cancelled'
  | 'completed';

export type PaymentStatus = 'unpaid' | 'paid_demo';

export interface BookingActionAvailability {
  canApprove: boolean;
  canDecline: boolean;
  canCancel: boolean;
  canComplete: boolean;
  canConfirmDemoPayment: boolean;
  canLeaveReview: boolean;
}

export function getAllowedBookingActions(params: {
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  isOwner: boolean;
  isRenter: boolean;
  isAdmin: boolean;
  hasReviewed: boolean;
}): BookingActionAvailability {
  const { status, paymentStatus, isOwner, isRenter, isAdmin, hasReviewed } = params;

  return {
    canApprove: isOwner && status === 'pending',
    canDecline: isOwner && status === 'pending',
    canCancel: isRenter && status === 'pending',
    canComplete: (isOwner || isAdmin) && status === 'approved',
    canConfirmDemoPayment: isRenter && status === 'approved' && paymentStatus === 'unpaid',
    canLeaveReview: isRenter && status === 'completed' && !hasReviewed,
  };
}

export function canTransitionBookingStatus(params: {
  currentStatus: BookingStatus;
  nextStatus: Exclude<BookingStatus, 'pending'>;
  isOwner: boolean;
  isRenter: boolean;
  isAdmin: boolean;
}): { allowed: boolean; reason?: string } {
  const { currentStatus, nextStatus, isOwner, isRenter, isAdmin } = params;

  if (nextStatus === 'approved' || nextStatus === 'declined') {
    if (!isOwner) {
      return {
        allowed: false,
        reason: 'Only the listing owner can approve or decline booking requests.',
      };
    }
    if (currentStatus !== 'pending') {
      return {
        allowed: false,
        reason: `Cannot mark a ${currentStatus} booking as ${nextStatus}.`,
      };
    }
    return { allowed: true };
  }

  if (nextStatus === 'cancelled') {
    if (!isRenter) {
      return {
        allowed: false,
        reason: 'Only the renter who sent this request can cancel it.',
      };
    }
    if (currentStatus !== 'pending') {
      return {
        allowed: false,
        reason: 'Only pending booking requests can be cancelled.',
      };
    }
    return { allowed: true };
  }

  if (nextStatus === 'completed') {
    if (!isOwner && !isAdmin) {
      return {
        allowed: false,
        reason: 'Only the listing owner or a moderator can mark a rental completed.',
      };
    }
    if (currentStatus !== 'approved') {
      return {
        allowed: false,
        reason: 'Only approved bookings can be marked as completed.',
      };
    }
    return { allowed: true };
  }

  return { allowed: false, reason: 'Unsupported booking status transition.' };
}

export function canReviewBooking(params: {
  status: BookingStatus;
  isRenter: boolean;
  alreadyReviewed: boolean;
}): { allowed: boolean; reason?: string } {
  if (!params.isRenter) {
    return { allowed: false, reason: 'Only the renter for this booking can leave a review.' };
  }
  if (params.status !== 'completed') {
    return {
      allowed: false,
      reason: 'Reviews can only be submitted after the rental is marked completed.',
    };
  }
  if (params.alreadyReviewed) {
    return { allowed: false, reason: 'You have already reviewed this completed booking.' };
  }
  return { allowed: true };
}

export function getBookingStatusMeta(status: BookingStatus): {
  label: string;
  textClass: string;
  bgClass: string;
} {
  switch (status) {
    case 'pending':
      return {
        label: 'Pending approval',
        textClass: 'text-[#B45309]',
        bgClass: 'bg-[#FEF3C7]',
      };
    case 'approved':
      return {
        label: 'Approved',
        textClass: 'text-[#0F766E]',
        bgClass: 'bg-[#CCFBF1]',
      };
    case 'completed':
      return {
        label: 'Completed',
        textClass: 'text-[#15803D]',
        bgClass: 'bg-[#DCFCE7]',
      };
    case 'declined':
      return {
        label: 'Declined',
        textClass: 'text-[#B91C1C]',
        bgClass: 'bg-[#FEE2E2]',
      };
    case 'cancelled':
      return {
        label: 'Cancelled',
        textClass: 'text-[#475569]',
        bgClass: 'bg-[#F1F5F9]',
      };
  }
}
