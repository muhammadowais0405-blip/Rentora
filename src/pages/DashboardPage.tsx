import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  archiveListing,
  getDashboardOverview,
  getMyListings,
  getReceivedBookings,
  promoteListingDemo,
  updateBookingStatus,
} from '../lib/api';
import type {
  BookingStatus,
  BookingSummary,
  DashboardOverview,
  ListingSummary,
} from '../types/marketplace';
import { formatPkr } from '../utils/rentalMath';
import { getBookingStatusMeta } from '../utils/bookingRules';
import { SafeImage } from '../components/common/SafeImage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState, ErrorBanner } from '../components/common/StateBlocks';

type DashboardTab = 'overview' | 'listings' | 'requests' | 'history' | 'featured';

export function DashboardPage() {
  const { user, loading: authLoading, refreshUserActivity } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [receivedBookings, setReceivedBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [selectedPromoListingId, setSelectedPromoListingId] = useState<number>(0);
  const [selectedPlan, setSelectedPlan] = useState<
    '7-Day Spotlight (Demo)' | '30-Day Featured Boost (Demo)'
  >('7-Day Spotlight (Demo)');

  const [confirmState, setConfirmState] = useState<{
    kind: 'booking' | 'archive';
    id: number;
    nextStatus?: Exclude<BookingStatus, 'pending'>;
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
  } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, myItems, received] = await Promise.all([
        getDashboardOverview(),
        getMyListings(),
        getReceivedBookings(),
      ]);
      setOverview(ov);
      setListings(myItems);
      setReceivedBookings(received);
      const firstActive = myItems.find((item) => item.status === 'active');
      if (firstActive) {
        setSelectedPromoListingId((prev) => prev || firstActive.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load owner dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadDashboard();
    }
  }, [user, loadDashboard]);

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-72 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/dashboard" replace />;
  }

  const handleConfirm = async () => {
    if (!confirmState) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      if (confirmState.kind === 'booking' && confirmState.nextStatus) {
        await updateBookingStatus(confirmState.id, confirmState.nextStatus);
        setFeedback(`Booking #${confirmState.id} updated to ${confirmState.nextStatus}.`);
      } else if (confirmState.kind === 'archive') {
        await archiveListing(confirmState.id);
        setFeedback('Listing archived from Rentora.');
      }
      setConfirmState(null);
      await loadDashboard();
      await refreshUserActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete action.');
      setConfirmState(null);
    } finally {
      setBusy(false);
    }
  };

  const handleActivatePromotion = async () => {
    if (!selectedPromoListingId) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await promoteListingDemo(selectedPromoListingId, selectedPlan);
      setFeedback(
        `Simulated ${selectedPlan} activated through ${res.featuredUntil}. The listing now carries a Featured demo label.`,
      );
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to activate demo promotion.');
    } finally {
      setBusy(false);
    }
  };

  const activeRequests = receivedBookings.filter(
    (b) => b.status === 'pending' || b.status === 'approved',
  );
  const historyBookings = receivedBookings.filter(
    (b) => b.status === 'completed' || b.status === 'declined' || b.status === 'cancelled',
  );
  const activeOwnedListings = listings.filter((l) => l.status === 'active');

  const navItems: Array<{ key: DashboardTab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'listings', label: `My listings (${listings.length})` },
    { key: 'requests', label: `Booking requests (${activeRequests.length})` },
    { key: 'history', label: `Booking history (${historyBookings.length})` },
    { key: 'featured', label: 'Featured plans (demo)' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            Owner dashboard
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Manage listings, incoming booking approvals, and simulated featured placements for {user.name}.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/bookings"
            className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#172554] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap"
          >
            All bookings
          </Link>
          <Link
            to="/list-item"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>List an item</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={loadDashboard} />
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="mt-6 rounded-xl bg-[#F0FDF4] p-4 text-sm text-[#15803D] flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Workspace Tab Navigation */}
      <div
        role="tablist"
        aria-label="Owner dashboard sections"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        {navItems.map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'bg-[#172554] text-white'
                  : 'bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#172554]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          {/* TAB: OVERVIEW */}
          {tab === 'overview' && overview && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
                  <p className="text-xs font-medium text-[#64748B]">Active demo listings</p>
                  <p className="mt-2 font-display text-3xl font-bold text-[#172554] tabular-nums">
                    {overview.activeListings}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                    {overview.pendingListings} pending review
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
                  <p className="text-xs font-medium text-[#64748B]">Pending booking requests</p>
                  <p className="mt-2 font-display text-3xl font-bold text-[#B45309] tabular-nums">
                    {overview.pendingRequestsReceived}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                    {overview.approvedUpcoming} approved upcoming
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
                  <p className="text-xs font-medium text-[#64748B]">Completed rentals</p>
                  <p className="mt-2 font-display text-3xl font-bold text-[#0F766E] tabular-nums">
                    {overview.completedRentals}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Verified in SQLite records
                  </p>
                </div>

                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5">
                  <p className="text-xs font-medium text-[#64748B]">Confirmed demo earnings</p>
                  <p className="mt-2 font-display text-3xl font-bold text-[#172554] tabular-nums">
                    {formatPkr(overview.totalEarnedDemo)}
                  </p>
                  <p className="mt-1 text-xs text-[#64748B]">
                    Illustrative demo figure only
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <section className="lg:col-span-7 rounded-2xl bg-white border border-[#E2E8F0] p-6">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                    <h2 className="font-display text-lg font-bold text-[#172554]">
                      Action needed: incoming requests
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('requests')}
                      className="text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer"
                    >
                      View all requests
                    </button>
                  </div>

                  {activeRequests.length === 0 ? (
                    <p className="mt-4 text-sm text-[#64748B]">
                      No pending or upcoming incoming requests at the moment.
                    </p>
                  ) : (
                    <div className="mt-3 divide-y divide-[#F1F5F9]">
                      {activeRequests.slice(0, 4).map((b) => {
                        const statusMeta = getBookingStatusMeta(b.status);
                        return (
                          <div
                            key={b.id}
                            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <Link
                                to={`/bookings/${b.id}`}
                                className="font-semibold text-sm text-[#0F172A] hover:text-[#0F766E] truncate block"
                              >
                                {b.listingTitle}
                              </Link>
                              <p className="text-xs text-[#64748B] tabular-nums mt-0.5">
                                {b.renterName} · {b.startDate} to {b.endDate} ·{' '}
                                {formatPkr(b.rentalTotal)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <Link
                                to={`/bookings/${b.id}`}
                                className="px-3 py-1.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-[#F1F5F9]"
                              >
                                Review
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="lg:col-span-5 rounded-2xl bg-white border border-[#E2E8F0] p-6">
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#E2E8F0]">
                    <h2 className="font-display text-lg font-bold text-[#172554]">
                      Featured visibility
                    </h2>
                    <button
                      type="button"
                      onClick={() => setTab('featured')}
                      className="text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer"
                    >
                      Compare demo plans
                    </button>
                  </div>
                  <p className="mt-4 text-sm text-[#475569] leading-relaxed">
                    You currently have{' '}
                    <span className="font-semibold text-[#172554] tabular-nums">
                      {overview.activePromotionsCount}
                    </span>{' '}
                    featured demo{' '}
                    {overview.activePromotionsCount === 1 ? 'listing' : 'listings'}. Use
                    simulated promotion plans to preview homepage spotlight placement.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('featured')}
                    className="mt-5 w-full h-10 rounded-xl border border-[#E2E8F0] hover:bg-[#F1F5F9] text-sm font-semibold text-[#172554] transition-colors cursor-pointer"
                  >
                    Manage featured demo plans
                  </button>
                </section>
              </div>
            </div>
          )}

          {/* TAB: MY LISTINGS */}
          {tab === 'listings' && (
            <div>
              {listings.length === 0 ? (
                <EmptyState
                  title="You have not listed any gear yet"
                  description="Create your first listing with local photos and optional AI draft suggestions."
                  actionLabel="Create listing"
                  onAction={() => navigate('/list-item')}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {listings.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden flex flex-col"
                    >
                      <div className="relative aspect-[4/3] bg-[#F1F5F9]">
                        <SafeImage
                          src={item.coverImage}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {item.isFeatured && (
                          <span className="absolute top-3 left-3 rounded-md bg-[#FEF3C7] text-[#B45309] px-2.5 py-1 text-xs font-semibold">
                            Featured (demo)
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex flex-1 flex-col">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-[#64748B] truncate">
                            {item.categoryName} · {item.locationText}
                          </span>
                          <span
                            className={`font-semibold shrink-0 capitalize ${
                              item.status === 'active'
                                ? 'text-[#15803D]'
                                : item.status === 'pending'
                                  ? 'text-[#B45309]'
                                  : 'text-[#64748B]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <h3 className="mt-1.5 font-display text-base font-semibold text-[#0F172A] truncate">
                          {item.title}
                        </h3>
                        <p className="mt-1 font-display tabular-nums text-sm font-bold text-[#172554]">
                          {formatPkr(item.dailyPrice)} / day
                        </p>

                        <div className="mt-auto pt-4 flex items-center gap-2 border-t border-[#F1F5F9]">
                          <Link
                            to={`/items/${item.id}`}
                            className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-[#F1F5F9]"
                          >
                            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>View</span>
                          </Link>
                          <Link
                            to={`/items/${item.id}/edit`}
                            className="flex-1 inline-flex items-center justify-center gap-1 h-9 rounded-lg bg-[#CCFBF1] text-xs font-semibold text-[#0F766E] hover:bg-[#99F6E4]"
                          >
                            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Edit</span>
                          </Link>
                          <button
                            type="button"
                            aria-label={`Archive ${item.title}`}
                            onClick={() =>
                              setConfirmState({
                                kind: 'archive',
                                id: item.id,
                                title: 'Archive listing?',
                                description: `Hide "${item.title}" from Rentora? Existing booking records will remain intact.`,
                                confirmLabel: 'Archive',
                                tone: 'danger',
                              })
                            }
                            className="h-9 px-2.5 rounded-lg border border-[#E2E8F0] text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: BOOKING REQUESTS */}
          {tab === 'requests' && (
            <div>
              {activeRequests.length === 0 ? (
                <EmptyState
                  title="No active booking requests"
                  description="When renters request dates for your listings, you can approve or decline them here."
                />
              ) : (
                <div className="space-y-4">
                  {activeRequests.map((booking) => {
                    const statusMeta = getBookingStatusMeta(booking.status);
                    return (
                      <article
                        key={booking.id}
                        className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-4 min-w-0">
                          <Link
                            to={`/bookings/${booking.id}`}
                            className="w-24 aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F5F9] shrink-0 block"
                          >
                            <SafeImage
                              src={booking.listingCoverImage}
                              alt={booking.listingTitle}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <span className="text-xs text-[#64748B] tabular-nums">
                                Booking #{booking.id}
                              </span>
                            </div>
                            <Link
                              to={`/bookings/${booking.id}`}
                              className="mt-1 font-display text-base font-semibold text-[#172554] hover:text-[#0F766E] block truncate"
                            >
                              {booking.listingTitle}
                            </Link>
                            <p className="mt-1 text-xs sm:text-sm text-[#475569] tabular-nums">
                              Renter: <span className="font-semibold">{booking.renterName}</span> ·{' '}
                              {booking.startDate} to {booking.endDate} ·{' '}
                              <span className="font-semibold text-[#172554]">
                                {formatPkr(booking.rentalTotal)}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({
                                    kind: 'booking',
                                    id: booking.id,
                                    nextStatus: 'approved',
                                    title: 'Approve booking request?',
                                    description: `Approve ${booking.renterName}'s dates (${booking.startDate} to ${booking.endDate}) for ${booking.listingTitle}?`,
                                    confirmLabel: 'Approve',
                                    tone: 'primary',
                                  })
                                }
                                className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmState({
                                    kind: 'booking',
                                    id: booking.id,
                                    nextStatus: 'declined',
                                    title: 'Decline booking request?',
                                    description: `Decline ${booking.renterName}'s booking request?`,
                                    confirmLabel: 'Decline',
                                    tone: 'danger',
                                  })
                                }
                                className="px-4 py-2 rounded-xl border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {booking.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmState({
                                  kind: 'booking',
                                  id: booking.id,
                                  nextStatus: 'completed',
                                  title: 'Mark rental completed?',
                                  description: `Mark ${booking.listingTitle} returned and completed?`,
                                  confirmLabel: 'Mark completed',
                                  tone: 'primary',
                                })
                              }
                              className="px-4 py-2 rounded-xl bg-[#172554] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Mark completed
                            </button>
                          )}
                          <Link
                            to={`/bookings/${booking.id}`}
                            className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-[#F1F5F9]"
                          >
                            Details
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: BOOKING HISTORY */}
          {tab === 'history' && (
            <div>
              {historyBookings.length === 0 ? (
                <EmptyState
                  title="No completed or closed bookings yet"
                  description="Completed, declined, and cancelled incoming rentals will appear here."
                />
              ) : (
                <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-[#E2E8F0] text-xs text-[#64748B]">
                      <tr>
                        <th className="py-3.5 px-4 font-semibold">Booking</th>
                        <th className="py-3.5 px-4 font-semibold">Item</th>
                        <th className="py-3.5 px-4 font-semibold">Renter</th>
                        <th className="py-3.5 px-4 font-semibold">Dates</th>
                        <th className="py-3.5 px-4 font-semibold text-right">Total</th>
                        <th className="py-3.5 px-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9]">
                      {historyBookings.map((b) => {
                        const meta = getBookingStatusMeta(b.status);
                        return (
                          <tr key={b.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-3 px-4 tabular-nums font-medium">
                              <Link
                                to={`/bookings/${b.id}`}
                                className="text-[#0F766E] hover:underline"
                              >
                                #{b.id}
                              </Link>
                            </td>
                            <td className="py-3 px-4 font-medium text-[#0F172A]">
                              {b.listingTitle}
                            </td>
                            <td className="py-3 px-4 text-[#475569]">{b.renterName}</td>
                            <td className="py-3 px-4 tabular-nums text-[#475569]">
                              {b.startDate} → {b.endDate}
                            </td>
                            <td className="py-3 px-4 tabular-nums font-semibold text-[#172554] text-right">
                              {formatPkr(b.rentalTotal)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`rounded-md px-2 py-0.5 text-xs font-semibold ${meta.bgClass} ${meta.textClass}`}
                              >
                                {meta.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: FEATURED PLANS (SIMULATED) */}
          {tab === 'featured' && (
            <div className="space-y-8">
              <div className="rounded-2xl bg-[#172554] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold text-[#5EEAD4]">
                    Simulated Promotion Demo
                  </p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold">
                    Boost your listing visibility on Rentora
                  </h2>
                  <p className="mt-2 text-sm text-slate-300 max-w-2xl">
                    Compare free standard placement with simulated featured spotlight plans.
                    No real payment, card, or recurring subscription is charged in this prototype.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-[#5EEAD4] shrink-0">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Simulated demo only</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
                  <p className="text-xs font-semibold text-[#64748B]">Standard</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#172554]">
                    Free listing
                  </h3>
                  <p className="mt-2 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
                    Rs. 0
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[#475569]">
                    <li>· Appears in category &amp; search results</li>
                    <li>· Standard AI Rental Finder eligibility</li>
                    <li>· Up to 5 local listing photos</li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-white border border-[#0F766E] p-6">
                  <p className="text-xs font-semibold text-[#0F766E]">7-Day Spotlight</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#172554]">
                    7-Day Spotlight (Demo)
                  </h3>
                  <p className="mt-2 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
                    Rs. 350 <span className="text-xs font-normal text-[#64748B]">(simulated)</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[#475569]">
                    <li>· Visible &ldquo;Featured&rdquo; label on cards</li>
                    <li>· Moves item into Home featured row</li>
                    <li>· 7-day simulated boost window</li>
                  </ul>
                </div>

                <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
                  <p className="text-xs font-semibold text-[#B45309]">Owner Pro Demo</p>
                  <h3 className="mt-1 font-display text-lg font-bold text-[#172554]">
                    30-Day Featured Boost (Demo)
                  </h3>
                  <p className="mt-2 font-display text-2xl font-bold text-[#0F172A] tabular-nums">
                    Rs. 950 <span className="text-xs font-normal text-[#64748B]">(simulated)</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-[#475569]">
                    <li>· Priority placement in Recommended sort</li>
                    <li>· Visible &ldquo;Featured&rdquo; label on browse cards</li>
                    <li>· 30-day simulated boost window</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6">
                <h3 className="font-display text-lg font-bold text-[#172554]">
                  Activate simulated featured placement
                </h3>
                {activeOwnedListings.length === 0 ? (
                  <p className="mt-2 text-sm text-[#64748B]">
                    You need at least one active listing before applying a demo promotion.
                  </p>
                ) : (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-5">
                      <label
                        htmlFor="promo-listing"
                        className="block text-xs font-semibold text-[#475569] mb-1.5"
                      >
                        Select active listing
                      </label>
                      <select
                        id="promo-listing"
                        value={selectedPromoListingId}
                        onChange={(e) => setSelectedPromoListingId(Number(e.target.value))}
                        className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                      >
                        {activeOwnedListings.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title} {item.isFeatured ? '(Already Featured)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <label
                        htmlFor="promo-plan"
                        className="block text-xs font-semibold text-[#475569] mb-1.5"
                      >
                        Simulated plan
                      </label>
                      <select
                        id="promo-plan"
                        value={selectedPlan}
                        onChange={(e) =>
                          setSelectedPlan(
                            e.target.value as
                              | '7-Day Spotlight (Demo)'
                              | '30-Day Featured Boost (Demo)',
                          )
                        }
                        className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                      >
                        <option value="7-Day Spotlight (Demo)">
                          7-Day Spotlight (Demo)
                        </option>
                        <option value="30-Day Featured Boost (Demo)">
                          30-Day Featured Boost (Demo)
                        </option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        disabled={busy || !selectedPromoListingId}
                        onClick={handleActivatePromotion}
                        className="w-full h-11 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {busy ? 'Activating...' : 'Activate demo boost'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title ?? ''}
        description={confirmState?.description ?? ''}
        confirmLabel={confirmState?.confirmLabel ?? 'Confirm'}
        tone={confirmState?.tone ?? 'primary'}
        busy={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />
    </main>
  );
}
