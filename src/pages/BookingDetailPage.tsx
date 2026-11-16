import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  confirmDemoPayment,
  getBookingDetail,
  submitBookingReview,
  updateBookingStatus,
} from '../lib/api';
import type { BookingDetail, BookingStatus } from '../types/marketplace';
import { formatPkr } from '../utils/rentalMath';
import {
  getAllowedBookingActions,
  getBookingStatusMeta,
} from '../utils/bookingRules';
import { SafeImage } from '../components/common/SafeImage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ErrorBanner } from '../components/common/StateBlocks';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, refreshUserActivity } = useAuth();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    type: 'status' | 'payment';
    nextStatus?: Exclude<BookingStatus, 'pending'>;
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
  } | null>(null);

  // Review state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);

  const loadBooking = useCallback(async () => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Invalid booking ID.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await getBookingDetail(numericId);
      setBooking(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load booking details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      loadBooking();
    }
  }, [user, loadBooking]);

  if (authLoading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-72 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=/bookings/${id ?? ''}`} replace />;
  }

  const handleConfirmedAction = async () => {
    if (!booking || !confirmState) return;
    setActionBusy(true);
    setError(null);
    try {
      if (confirmState.type === 'status' && confirmState.nextStatus) {
        await updateBookingStatus(booking.id, confirmState.nextStatus);
      } else if (confirmState.type === 'payment') {
        await confirmDemoPayment(booking.id);
      }
      setConfirmState(null);
      await loadBooking();
      await refreshUserActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
      setConfirmState(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleSubmitReview = async (event: FormEvent) => {
    event.preventDefault();
    if (!booking) return;
    setReviewError(null);
    setReviewBusy(true);
    try {
      await submitBookingReview({
        bookingId: booking.id,
        rating,
        comment,
      });
      setComment('');
      await loadBooking();
      await refreshUserActivity();
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Unable to save review.');
    } finally {
      setReviewBusy(false);
    }
  };

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-80 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (error && !booking) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <ErrorBanner message={error} onRetry={loadBooking} />
        <div className="mt-4">
          <Link to="/bookings" className="text-sm font-semibold text-[#0F766E] hover:underline">
            Back to all bookings
          </Link>
        </div>
      </main>
    );
  }

  if (!booking) return null;

  const isOwner = user.id === booking.ownerId;
  const isRenter = user.id === booking.renterId;
  const isAdmin = user.role === 'admin';
  const statusMeta = getBookingStatusMeta(booking.status);
  const actions = getAllowedBookingActions({
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    isOwner,
    isRenter,
    isAdmin,
    hasReviewed: booking.hasReviewed,
  });

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-2 text-xs sm:text-sm text-[#64748B] mb-6"
      >
        <Link to="/bookings" className="hover:text-[#0F766E]">
          Bookings
        </Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-[#0F172A] font-medium tabular-nums">
          Booking #{booking.id}
        </span>
      </nav>

      {error && (
        <div className="mb-6">
          <ErrorBanner message={error} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Main Booking Summary */}
        <section className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
              <div>
                <p className="text-xs font-medium text-[#64748B] tabular-nums">
                  Booking #{booking.id} · Requested {booking.createdAt.slice(0, 10)}
                </p>
                <h1 className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#172554]">
                  {booking.listingTitle}
                </h1>
              </div>
              <span
                className={`rounded-md px-3 py-1 text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
              >
                {statusMeta.label}
              </span>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-4">
              <Link
                to={`/items/${booking.listingId}`}
                className="w-full sm:w-36 aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F5F9] shrink-0 block"
              >
                <SafeImage
                  src={booking.listingCoverImage}
                  alt={booking.listingTitle}
                  className="w-full h-full object-cover"
                />
              </Link>
              <div className="space-y-1.5 text-sm text-[#475569]">
                <p>
                  <span className="font-semibold text-[#0F172A]">Category:</span>{' '}
                  {booking.listingCategoryName}
                </p>
                <p>
                  <span className="font-semibold text-[#0F172A]">Condition:</span>{' '}
                  {booking.listingCondition}
                </p>
                <p>
                  <span className="font-semibold text-[#0F172A]">Pickup area:</span>{' '}
                  {booking.listingLocation}
                </p>
                <Link
                  to={`/items/${booking.listingId}`}
                  className="inline-block pt-1 text-xs font-semibold text-[#0F766E] hover:underline"
                >
                  Open listing page
                </Link>
              </div>
            </div>

            {booking.renterNote && (
              <div className="mt-5 pt-4 border-t border-[#F1F5F9]">
                <p className="text-xs font-semibold text-[#64748B]">Renter pickup note</p>
                <p className="mt-1 text-sm text-[#0F172A]">{booking.renterNote}</p>
              </div>
            )}

            <div className="mt-5 pt-5 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold text-[#64748B]">Renter</p>
                <p className="mt-1 font-semibold text-[#0F172A]">{booking.renterName}</p>
                <p className="text-xs text-[#64748B]">{booking.renterEmail}</p>
                {booking.renterPhone && (
                  <p className="text-xs text-[#64748B] tabular-nums">{booking.renterPhone}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#64748B]">Owner</p>
                <p className="mt-1 font-semibold text-[#0F172A]">{booking.ownerName}</p>
                <p className="text-xs text-[#64748B]">{booking.ownerEmail}</p>
                {booking.ownerPhone && (
                  <p className="text-xs text-[#64748B] tabular-nums">{booking.ownerPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
            <h2 className="font-display text-lg font-bold text-[#172554]">
              Booking timeline
            </h2>
            {booking.statusHistory.length === 0 ? (
              <p className="mt-2 text-sm text-[#64748B]">
                Created on {booking.createdAt.slice(0, 10)}.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {booking.statusHistory.map((step) => (
                  <li
                    key={step.id}
                    className="flex items-center justify-between gap-4 text-sm pb-3 border-b border-[#F1F5F9] last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold text-[#0F172A] capitalize">
                        {step.newStatus}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {step.changedByName
                          ? `Updated by ${step.changedByName}`
                          : 'Marketplace system'}
                      </p>
                    </div>
                    <span className="text-xs text-[#64748B] tabular-nums">
                      {step.createdAt.slice(0, 16)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Review Section */}
          {(booking.review || actions.canLeaveReview) && (
            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
              <h2 className="font-display text-lg font-bold text-[#172554]">
                Renter feedback
              </h2>

              {booking.review ? (
                <div className="mt-4">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F172A]">
                    <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
                    <span className="tabular-nums">{booking.review.rating}.0 / 5.0</span>
                    <span className="text-xs font-normal text-[#64748B] ml-2 tabular-nums">
                      {booking.review.createdAt.slice(0, 10)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[#334155]">
                    {booking.review.comment}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
                  <p className="text-sm text-[#475569]">
                    This rental is completed. Share how the item condition and handover went.
                  </p>

                  {reviewError && (
                    <div
                      role="alert"
                      className="rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#B91C1C]"
                    >
                      {reviewError}
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="review-rating"
                      className="block text-xs font-semibold text-[#475569] mb-1.5"
                    >
                      Rating
                    </label>
                    <select
                      id="review-rating"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="h-10 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                    >
                      <option value={5}>5 — Excellent</option>
                      <option value={4}>4 — Good</option>
                      <option value={3}>3 — Fair</option>
                      <option value={2}>2 — Below expectations</option>
                      <option value={1}>1 — Poor</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="review-comment"
                      className="block text-xs font-semibold text-[#475569] mb-1.5"
                    >
                      Review comment
                    </label>
                    <textarea
                      id="review-comment"
                      rows={3}
                      required
                      minLength={8}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Describe item condition, pickup experience, and accuracy..."
                      className="w-full p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={reviewBusy}
                    className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {reviewBusy ? 'Submitting review...' : 'Submit review'}
                  </button>
                </form>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Totals, Actions & Simulated Payment */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
            <h2 className="font-display text-lg font-bold text-[#172554]">
              Price &amp; payment summary
            </h2>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-[#475569] tabular-nums">
                <span>Rental window</span>
                <span className="font-medium text-[#0F172A]">
                  {booking.startDate} to {booking.endDate}
                </span>
              </div>
              <div className="flex justify-between text-[#475569] tabular-nums">
                <span>
                  {formatPkr(booking.dailyPriceSnapshot)} × {booking.rentalDays}{' '}
                  {booking.rentalDays === 1 ? 'day' : 'days'}
                </span>
                <span className="font-semibold text-[#0F172A]">
                  {formatPkr(booking.rentalTotal)}
                </span>
              </div>
              <div className="flex justify-between text-[#475569] tabular-nums">
                <span>Refundable deposit (demo)</span>
                <span className="font-medium text-[#0F172A]">
                  {formatPkr(booking.depositSnapshot)}
                </span>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] flex justify-between items-baseline tabular-nums">
                <span className="font-semibold text-[#172554]">Rental total</span>
                <span className="font-display text-xl font-bold text-[#172554]">
                  {formatPkr(booking.rentalTotal)}
                </span>
              </div>
            </div>

            {/* Simulated Demo Payment Status */}
            <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
              {booking.paymentStatus === 'paid_demo' ? (
                <div className="rounded-xl bg-[#F0FDF4] p-3.5 text-xs sm:text-sm text-[#15803D] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="font-semibold">Demo payment confirmed</p>
                    <p className="text-xs mt-0.5 text-[#166534]">
                      Demo payment only — no real money was charged.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-[#F8FAFC] p-3.5 text-xs text-[#475569] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    Demo payment only — no real money is charged or card details collected.
                  </span>
                </div>
              )}
            </div>

            {/* Role-Scoped Action Buttons */}
            <div className="mt-5 space-y-2.5">
              {actions.canConfirmDemoPayment && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: 'payment',
                      title: 'Confirm demo payment?',
                      description: `Confirm simulated rental payment of ${formatPkr(booking.rentalTotal)} for ${booking.listingTitle}. Demo payment only — no real money is charged.`,
                      confirmLabel: 'Confirm demo payment',
                      tone: 'primary',
                    })
                  }
                  className="w-full h-11 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" aria-hidden="true" />
                  <span>Confirm demo payment</span>
                </button>
              )}

              {actions.canApprove && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: 'status',
                      nextStatus: 'approved',
                      title: 'Approve booking request?',
                      description: `Approve ${booking.renterName}'s request for ${booking.startDate} to ${booking.endDate}?`,
                      confirmLabel: 'Approve request',
                      tone: 'primary',
                    })
                  }
                  className="w-full h-11 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Approve request
                </button>
              )}

              {actions.canDecline && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: 'status',
                      nextStatus: 'declined',
                      title: 'Decline booking request?',
                      description: `Decline ${booking.renterName}'s booking request?`,
                      confirmLabel: 'Decline request',
                      tone: 'danger',
                    })
                  }
                  className="w-full h-11 rounded-xl border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Decline request
                </button>
              )}

              {actions.canComplete && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: 'status',
                      nextStatus: 'completed',
                      title: 'Mark rental completed?',
                      description: `Confirm ${booking.listingTitle} was returned so the renter can review this demo rental.`,
                      confirmLabel: 'Mark completed',
                      tone: 'primary',
                    })
                  }
                  className="w-full h-11 rounded-xl bg-[#172554] hover:bg-[#1E3A5F] text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  Mark rental completed
                </button>
              )}

              {actions.canCancel && (
                <button
                  type="button"
                  onClick={() =>
                    setConfirmState({
                      type: 'status',
                      nextStatus: 'cancelled',
                      title: 'Cancel booking request?',
                      description: `Cancel your pending booking request for ${booking.listingTitle}?`,
                      confirmLabel: 'Cancel request',
                      tone: 'danger',
                    })
                  }
                  className="w-full h-11 rounded-xl border border-[#E2E8F0] text-[#475569] hover:text-[#B91C1C] hover:bg-[#FEF2F2] text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancel pending request
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
        tone={confirmState?.tone ?? 'primary'}
        busy={actionBusy}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirmState(null)}
      />
    </main>
  );
}
