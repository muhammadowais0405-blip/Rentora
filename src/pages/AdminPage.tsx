import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, Eye, Flag, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAdminListings,
  getAdminReports,
  getAdminUsers,
  resolveAdminReport,
  updateAdminListingStatus,
} from '../lib/api';
import type {
  AdminListingItem,
  AdminUserSummary,
  ListingReportItem,
} from '../types/marketplace';
import { formatPkr } from '../utils/rentalMath';
import { SafeImage } from '../components/common/SafeImage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState, ErrorBanner } from '../components/common/StateBlocks';

type AdminTab = 'listings' | 'users' | 'reports';

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<AdminTab>('listings');
  const [listings, setListings] = useState<AdminListingItem[]>([]);
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [reports, setReports] = useState<ListingReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [confirmModeration, setConfirmModeration] = useState<{
    kind: 'listing' | 'report';
    id: number;
    nextStatus?: 'active' | 'hidden' | 'pending';
    hideListing?: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    tone: 'primary' | 'danger';
  } | null>(null);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [listingData, userData, reportData] = await Promise.all([
        getAdminListings(),
        getAdminUsers(),
        getAdminReports(),
      ]);
      setListings(listingData);
      setUsers(userData);
      setReports(reportData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load moderation queue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    } else if (user) {
      setLoading(false);
    }
  }, [user, loadAdminData]);

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-64 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/admin" replace />;
  }

  if (user.role !== 'admin') {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="rounded-2xl bg-white border border-[#E2E8F0] p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-[#B91C1C] mx-auto" aria-hidden="true" />
          <h1 className="mt-4 font-display text-2xl font-bold text-[#172554]">
            Moderator access required
          </h1>
          <p className="mt-2 text-sm text-[#475569] max-w-md mx-auto">
            Only the seeded <code className="font-mono text-xs">admin@rentora.demo</code>{' '}
            account can view and moderate pending listings or sample reports.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold"
            >
              Switch to Admin Demo
            </Link>
            <Link
              to="/"
              className="px-5 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#172554] hover:bg-[#F1F5F9]"
            >
              Return home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const handleConfirmModeration = async () => {
    if (!confirmModeration) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    try {
      if (confirmModeration.kind === 'listing' && confirmModeration.nextStatus) {
        await updateAdminListingStatus(confirmModeration.id, confirmModeration.nextStatus);
        setFeedback(`Listing #${confirmModeration.id} set to ${confirmModeration.nextStatus}.`);
      } else if (confirmModeration.kind === 'report') {
        await resolveAdminReport(
          confirmModeration.id,
          Boolean(confirmModeration.hideListing),
        );
        setFeedback(`Report #${confirmModeration.id} marked resolved.`);
      }
      setConfirmModeration(null);
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to apply moderation action.');
      setConfirmModeration(null);
    } finally {
      setBusy(false);
    }
  };

  const pendingCount = listings.filter((l) => l.status === 'pending').length;
  const openReportsCount = reports.filter((r) => r.status === 'open').length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <p className="text-xs font-semibold text-[#0F766E]">Demo Moderator Console</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            Listing moderation &amp; demo oversight
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Review pending listings, hide flagged demo items, and inspect seeded user verification states.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs sm:text-sm tabular-nums text-[#475569]">
          <span>{pendingCount} pending review</span>
          <span aria-hidden="true">·</span>
          <span>{openReportsCount} open reports</span>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={loadAdminData} />
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="mt-6 rounded-xl bg-[#F0FDF4] p-4 text-sm text-[#15803D] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      <div
        role="tablist"
        aria-label="Moderation sections"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'listings'}
          onClick={() => setTab('listings')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            tab === 'listings'
              ? 'bg-[#172554] text-white'
              : 'bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#172554]'
          }`}
        >
          Listings queue ({listings.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'reports'}
          onClick={() => setTab('reports')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
            tab === 'reports'
              ? 'bg-[#172554] text-white'
              : 'bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#172554]'
          }`}
        >
          <Flag className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Sample reports ({reports.length})</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'users'}
          onClick={() => setTab('users')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
            tab === 'users'
              ? 'bg-[#172554] text-white'
              : 'bg-white border border-[#E2E8F0] text-[#475569] hover:text-[#172554]'
          }`}
        >
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Demo users ({users.length})</span>
        </button>
      </div>

      {loading ? (
        <div className="mt-8 h-64 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      ) : (
        <div className="mt-6">
          {/* LISTINGS QUEUE */}
          {tab === 'listings' && (
            <div className="space-y-4">
              {listings.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl bg-white border border-[#E2E8F0] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <Link
                      to={`/items/${item.id}`}
                      className="w-24 aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F5F9] shrink-0 block"
                    >
                      <SafeImage
                        src={item.coverImage}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </Link>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-md px-2 py-0.5 font-semibold capitalize ${
                            item.status === 'pending'
                              ? 'bg-[#FEF3C7] text-[#B45309]'
                              : item.status === 'active'
                                ? 'bg-[#DCFCE7] text-[#15803D]'
                                : 'bg-[#FEE2E2] text-[#B91C1C]'
                          }`}
                        >
                          {item.status}
                        </span>
                        <span className="text-[#64748B]">
                          {item.categoryName} · {item.locationText}
                        </span>
                      </div>
                      <h2 className="mt-1 font-display text-base font-semibold text-[#172554] truncate">
                        {item.title}
                      </h2>
                      <p className="mt-0.5 text-xs text-[#475569] tabular-nums">
                        Owner: {item.ownerName} ({item.ownerEmail}) ·{' '}
                        <span className="font-semibold text-[#0F172A]">
                          {formatPkr(item.dailyPrice)} / day
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      to={`/items/${item.id}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-[#F1F5F9]"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Preview</span>
                    </Link>

                    {item.status !== 'active' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModeration({
                            kind: 'listing',
                            id: item.id,
                            nextStatus: 'active',
                            title: 'Approve listing for public browse?',
                            description: `Set "${item.title}" to active so renters can discover and request it?`,
                            confirmLabel: 'Approve listing',
                            tone: 'primary',
                          })
                        }
                        className="px-3.5 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                    )}

                    {item.status !== 'hidden' && (
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmModeration({
                            kind: 'listing',
                            id: item.id,
                            nextStatus: 'hidden',
                            title: 'Hide listing from public browse?',
                            description: `Hide "${item.title}" from renters? The owner will receive a moderation update.`,
                            confirmLabel: 'Hide listing',
                            tone: 'danger',
                          })
                        }
                        className="px-3.5 py-2 rounded-xl border border-[#FECACA] text-[#B91C1C] hover:bg-[#FEF2F2] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Hide
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* SAMPLE REPORTS */}
          {tab === 'reports' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <EmptyState
                  title="No sample reports"
                  description="Reported listings for moderation review appear here."
                />
              ) : (
                reports.map((report) => (
                  <article
                    key={report.id}
                    className="rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded-md px-2 py-0.5 font-semibold capitalize ${
                            report.status === 'open'
                              ? 'bg-[#FEF3C7] text-[#B45309]'
                              : 'bg-[#F1F5F9] text-[#475569]'
                          }`}
                        >
                          {report.status}
                        </span>
                        <span className="text-[#64748B]">
                          Reported by {report.reporterName} · Listing status:{' '}
                          <span className="capitalize font-medium text-[#0F172A]">
                            {report.listingStatus}
                          </span>
                        </span>
                      </div>
                      <Link
                        to={`/items/${report.listingId}`}
                        className="mt-1.5 font-display text-base font-semibold text-[#172554] hover:text-[#0F766E] block"
                      >
                        {report.listingTitle}
                      </Link>
                      <p className="mt-1 text-sm text-[#475569]">{report.reason}</p>
                    </div>

                    {report.status === 'open' && (
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmModeration({
                              kind: 'report',
                              id: report.id,
                              hideListing: false,
                              title: 'Dismiss sample report?',
                              description: `Mark report #${report.id} resolved and keep "${report.listingTitle}" live?`,
                              confirmLabel: 'Resolve report',
                              tone: 'primary',
                            })
                          }
                          className="px-3.5 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#172554] hover:bg-[#F1F5F9] cursor-pointer"
                        >
                          Mark resolved
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setConfirmModeration({
                              kind: 'report',
                              id: report.id,
                              hideListing: true,
                              title: 'Hide reported listing?',
                              description: `Hide "${report.listingTitle}" from public browse and resolve report #${report.id}?`,
                              confirmLabel: 'Hide listing & resolve',
                              tone: 'danger',
                            })
                          }
                          className="px-3.5 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-semibold cursor-pointer"
                        >
                          Hide listing
                        </button>
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
          )}

          {/* DEMO USERS */}
          {tab === 'users' && (
            <div className="rounded-2xl bg-white border border-[#E2E8F0] overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#E2E8F0] text-xs text-[#64748B]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">User</th>
                    <th className="py-3.5 px-4 font-semibold">Email</th>
                    <th className="py-3.5 px-4 font-semibold">Role</th>
                    <th className="py-3.5 px-4 font-semibold">Demo verification</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Listings</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">{u.name}</td>
                      <td className="py-3 px-4 text-[#475569]">{u.email}</td>
                      <td className="py-3 px-4 capitalize text-[#0F766E] font-medium">
                        {u.role}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#475569]">
                        {u.emailVerifiedDemo ? 'Email verified (demo)' : 'Email pending'}
                        {' · '}
                        {u.phoneVerifiedDemo ? 'Phone verified (demo)' : 'Phone optional'}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">
                        {u.listingsCount}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-medium">
                        {u.bookingsCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmModeration)}
        title={confirmModeration?.title ?? ''}
        description={confirmModeration?.description ?? ''}
        confirmLabel={confirmModeration?.confirmLabel ?? 'Confirm'}
        tone={confirmModeration?.tone ?? 'primary'}
        busy={busy}
        onConfirm={handleConfirmModeration}
        onCancel={() => setConfirmModeration(null)}
      />
    </main>
  );
}
