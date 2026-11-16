import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Archive, CheckCircle2, Clock, Edit3, Eye, PlusCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ListingSummary } from '../types/marketplace';
import { archiveListing, getMyListings } from '../lib/api';
import { formatPkr } from '../utils/rentalMath';
import { SafeImage } from '../components/common/SafeImage';
import { EmptyState, ErrorBanner, SkeletonCard } from '../components/common/StateBlocks';

export function MyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);

  const loadMine = () => {
    setLoading(true);
    setError(null);
    getMyListings()
      .then(setItems)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to load your listings.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user) {
      loadMine();
    }
  }, [user]);

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/my-listings" replace />;
  }

  const handleConfirmArchive = async () => {
    if (!confirmArchiveId) return;
    setArchiving(true);
    try {
      await archiveListing(confirmArchiveId);
      setItems((prev) => prev.filter((item) => item.id !== confirmArchiveId));
      setConfirmArchiveId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to archive listing.');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            My listings
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Manage items owned by <span className="font-semibold text-[#0F172A]">{user.name}</span>.
          </p>
        </div>
        <Link
          to="/list-item"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap self-start sm:self-center"
        >
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span>New listing</span>
        </Link>
      </div>

      <div className="mt-8">
        {error && (
          <div className="mb-6">
            <ErrorBanner message={error} onRetry={loadMine} />
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="You have no listings yet"
            description="Upload a photo and use the AI Listing Generator or enter details manually to add your first rental item."
            actionLabel="List an item"
            onAction={() => {
              window.location.href = '/list-item';
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-col rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden"
              >
                <div className="aspect-[4/3] bg-[#F1F5F9]">
                  <SafeImage src={item.coverImage} alt={item.title} />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#64748B] truncate">
                      {item.categoryName} · {item.locationText}
                    </span>
                    {item.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#15803D] shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#B45309] shrink-0">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        Pending review
                      </span>
                    )}
                  </div>

                  <h2 className="mt-1.5 font-display text-base font-semibold text-[#0F172A] line-clamp-2">
                    {item.title}
                  </h2>

                  <p className="mt-2 font-display tabular-nums text-base font-bold text-[#172554]">
                    {formatPkr(item.dailyPrice)}{' '}
                    <span className="text-xs font-normal text-[#64748B]">/ day</span>
                  </p>

                  <div className="mt-auto pt-4 flex items-center gap-2 border-t border-[#F1F5F9]">
                    <Link
                      to={`/items/${item.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#F8FAFC] hover:bg-[#F1F5F9] text-xs font-semibold text-[#172554] transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>View</span>
                    </Link>
                    <Link
                      to={`/items/${item.id}/edit`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#CCFBF1] hover:bg-[#99F6E4] text-xs font-semibold text-[#0F766E] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Edit</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setConfirmArchiveId(item.id)}
                      aria-label={`Archive ${item.title}`}
                      className="h-9 px-3 rounded-xl hover:bg-[#FEF2F2] text-xs font-semibold text-[#B91C1C] transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {confirmArchiveId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-dialog-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E2E8F0] p-6 shadow-xl">
            <h2
              id="archive-dialog-title"
              className="font-display text-lg font-bold text-[#172554]"
            >
              Archive this listing?
            </h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Archiving hides this item from search and your active listings list.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmArchiveId(null)}
                className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={archiving}
                onClick={handleConfirmArchive}
                className="px-4 py-2 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
              >
                {archiving ? 'Archiving...' : 'Archive listing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
