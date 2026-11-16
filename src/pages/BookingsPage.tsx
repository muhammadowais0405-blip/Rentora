import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Bell, Calendar, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getMyBookings,
  getNotifications,
  getReceivedBookings,
  markAllNotificationsRead,
  markNotificationRead,
  updateBookingStatus,
} from '../lib/api';
import type { AppNotification, BookingStatus, BookingSummary } from '../types/marketplace';
import { formatPkr } from '../utils/rentalMath';
import { getBookingStatusMeta } from '../utils/bookingRules';
import { SafeImage } from '../components/common/SafeImage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState, ErrorBanner } from '../components/common/StateBlocks';

type BookingFilterTab =
  | 'all'
  | 'received'
  | 'sent'
  | 'approved'
  | 'completed'
  | 'closed';

interface TaggedBooking extends BookingSummary {
  direction: 'sent' | 'received';
}

export function BookingsPage() {
  const { user, loading: authLoading, refreshUserActivity } = useAuth();
  const navigate = useNavigate();
  const [sent, setSent] = useState<BookingSummary[]>([]);
  const [received, setReceived] = useState<BookingSummary[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<BookingFilterTab>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const [pendingConfirm, setPendingConfirm] = useState<{
    booking: TaggedBooking;
    nextStatus: Exclude<BookingStatus, 'pending'>;
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mineList, receivedList, notifData] = await Promise.all([
        getMyBookings(),
        getReceivedBookings(),
        getNotifications(),
      ]);
      setSent(mineList);
      setReceived(receivedList);
      setNotifications(notifData.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const combined = useMemo<TaggedBooking[]>(() => {
    const tagged: TaggedBooking[] = [
      ...received.map((b) => ({ ...b, direction: 'received' as const })),
      ...sent.map((b) => ({ ...b, direction: 'sent' as const })),
    ];
    return tagged.sort((a, b) => b.id - a.id);
  }, [received, sent]);

  const filtered = useMemo(() => {
    switch (activeTab) {
      case 'received':
        return combined.filter((b) => b.direction === 'received');
      case 'sent':
        return combined.filter((b) => b.direction === 'sent');
      case 'approved':
        return combined.filter((b) => b.status === 'approved');
      case 'completed':
        return combined.filter((b) => b.status === 'completed');
      case 'closed':
        return combined.filter((b) => b.status === 'declined' || b.status === 'cancelled');
      default:
        return combined;
    }
  }, [combined, activeTab]);

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-64 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/bookings" replace />;
  }

  const handleConfirmStatus = async () => {
    if (!pendingConfirm) return;
    setBusyAction(true);
    setError(null);
    try {
      await updateBookingStatus(pendingConfirm.booking.id, pendingConfirm.nextStatus);
      setPendingConfirm(null);
      await loadData();
      await refreshUserActivity();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update booking status.');
      setPendingConfirm(null);
    } finally {
      setBusyAction(false);
    }
  };

  const handleMarkNotificationRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      await refreshUserActivity();
    } catch {
      // ignore transient error
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await refreshUserActivity();
    } catch {
      // ignore transient error
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const tabs: Array<{ key: BookingFilterTab; label: string; count: number }> = [
    { key: 'all', label: 'All bookings', count: combined.length },
    { key: 'received', label: 'Received', count: received.length },
    { key: 'sent', label: 'Sent', count: sent.length },
    {
      key: 'approved',
      label: 'Upcoming',
      count: combined.filter((b) => b.status === 'approved').length,
    },
    {
      key: 'completed',
      label: 'Completed',
      count: combined.filter((b) => b.status === 'completed').length,
    },
    {
      key: 'closed',
      label: 'Closed',
      count: combined.filter((b) => b.status === 'declined' || b.status === 'cancelled')
        .length,
    },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            Bookings &amp; notifications
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Track incoming rental requests for your gear and bookings you requested as a renter.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#172554] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap"
          >
            Owner dashboard
          </Link>
          <Link
            to="/browse"
            className="px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Browse gear
          </Link>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={loadData} />
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left/Main Bookings List */}
        <section className="lg:col-span-8">
          {/* Segmented filter tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#172554] text-white'
                      : 'bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#172554]'
                  }`}
                >
                  {tab.label} <span className="tabular-nums opacity-80">({tab.count})</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="mt-6 space-y-4">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-32 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                title="No bookings match this view"
                description="Send a rental request from any listing page or check another status filter."
                actionLabel="Browse rentals"
                onAction={() => navigate('/browse')}
              />
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {filtered.map((booking) => {
                const statusMeta = getBookingStatusMeta(booking.status);
                const isOwnerView = booking.direction === 'received';

                return (
                  <article
                    key={`${booking.direction}-${booking.id}`}
                    className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5 flex flex-col sm:flex-row gap-4"
                  >
                    <Link
                      to={`/bookings/${booking.id}`}
                      className="w-full sm:w-32 aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F5F9] shrink-0 block"
                    >
                      <SafeImage
                        src={booking.listingCoverImage}
                        alt={booking.listingTitle}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-medium text-[#64748B]">
                          {isOwnerView
                            ? `Request from ${booking.renterName}`
                            : `Owner: ${booking.ownerName}`}
                          <span aria-hidden="true"> · </span>
                          <span className="tabular-nums">Booking #{booking.id}</span>
                        </p>
                        <span
                          className={`rounded-md px-2.5 py-0.5 text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <Link
                        to={`/bookings/${booking.id}`}
                        className="mt-1 font-display text-base sm:text-lg font-semibold text-[#172554] hover:text-[#0F766E] truncate"
                      >
                        {booking.listingTitle}
                      </Link>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-[#475569] tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                          {booking.startDate} to {booking.endDate} ({booking.rentalDays}{' '}
                          {booking.rentalDays === 1 ? 'day' : 'days'})
                        </span>
                        <span className="font-semibold text-[#172554]">
                          {formatPkr(booking.rentalTotal)}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          {booking.paymentStatus === 'paid_demo'
                            ? 'Demo payment confirmed'
                            : `Deposit (demo): ${formatPkr(booking.depositSnapshot)}`}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {isOwnerView && booking.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingConfirm({
                                    booking,
                                    nextStatus: 'approved',
                                    title: 'Approve booking request?',
                                    description: `Approve ${booking.renterName}'s request for ${booking.listingTitle} (${booking.startDate} to ${booking.endDate})? Overlapping pending requests will be blocked from approval.`,
                                    confirmLabel: 'Approve booking',
                                    tone: 'primary',
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingConfirm({
                                    booking,
                                    nextStatus: 'declined',
                                    title: 'Decline booking request?',
                                    description: `Decline ${booking.renterName}'s request for ${booking.listingTitle}?`,
                                    confirmLabel: 'Decline request',
                                    tone: 'danger',
                                  })
                                }
                                className="px-3.5 py-1.5 rounded-xl border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          )}

                          {isOwnerView && booking.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingConfirm({
                                  booking,
                                  nextStatus: 'completed',
                                  title: 'Mark rental as completed?',
                                  description: `Confirm ${booking.listingTitle} has been returned by ${booking.renterName}. Once completed, the renter can submit a review.`,
                                  confirmLabel: 'Mark completed',
                                  tone: 'primary',
                                })
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-[#172554] hover:bg-[#1E3A5F] text-white text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Mark completed
                            </button>
                          )}

                          {!isOwnerView && booking.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() =>
                                setPendingConfirm({
                                  booking,
                                  nextStatus: 'cancelled',
                                  title: 'Cancel booking request?',
                                  description: `Cancel your pending request for ${booking.listingTitle}?`,
                                  confirmLabel: 'Cancel request',
                                  tone: 'danger',
                                })
                              }
                              className="px-3.5 py-1.5 rounded-xl border border-[#E2E8F0] text-[#475569] hover:text-[#B91C1C] hover:bg-[#FEF2F2] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Cancel request
                            </button>
                          )}
                        </div>

                        <Link
                          to={`/bookings/${booking.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F766E] hover:underline ml-auto"
                        >
                          <span>View details</span>
                          <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Right Column: In-App Notifications */}
        <aside className="lg:col-span-4 rounded-2xl bg-white border border-[#E2E8F0] p-5">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-[#172554]">
                Notifications ({unreadCount} unread)
              </h2>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer whitespace-nowrap"
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-[#64748B]">
              In-app updates appear here whenever booking requests or listings change status.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-[#F1F5F9]">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`py-3.5 ${notif.isRead ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-[#0F172A]">{notif.title}</p>
                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkNotificationRead(notif.id)}
                        aria-label={`Mark "${notif.title}" as read`}
                        className="p-1 rounded-md text-[#0F766E] hover:bg-[#F0FDFA] shrink-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-[#475569]">{notif.body}</p>
                  <p className="mt-1 text-xs text-[#94A3B8] tabular-nums">
                    {notif.createdAt.slice(0, 10)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel ?? 'Confirm'}
        tone={pendingConfirm?.tone ?? 'primary'}
        busy={busyAction}
        onConfirm={handleConfirmStatus}
        onCancel={() => setPendingConfirm(null)}
      />
    </main>
  );
}
