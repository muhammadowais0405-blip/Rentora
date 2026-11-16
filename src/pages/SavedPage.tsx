import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { BookmarkX, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFavorites } from '../lib/api';
import type { ListingSummary } from '../types/marketplace';
import { formatPkr } from '../utils/rentalMath';
import { SafeImage } from '../components/common/SafeImage';
import { EmptyState, ErrorBanner, SkeletonCard } from '../components/common/StateBlocks';

export function SavedPage() {
  const { user, loading: authLoading, toggleFavorite } = useAuth();
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const loadSaved = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFavorites();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load saved items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSaved();
    }
  }, [user]);

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/saved" replace />;
  }

  const handleRemove = async (listingId: number) => {
    setRemovingId(listingId);
    try {
      await toggleFavorite(listingId);
      setItems((prev) => prev.filter((item) => item.id !== listingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to remove saved item.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            Saved rentals
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Items bookmarked by {user.name} for upcoming trips or projects.
          </p>
        </div>
        <Link
          to="/browse"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#172554] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap"
        >
          Explore more gear
        </Link>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={loadSaved} />
        </div>
      )}

      {loading ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonCard key={n} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="No saved rentals yet"
            description="Tap the heart button on any listing while browsing to keep track of items you want to rent later."
            actionLabel="Browse rentals"
            onAction={() => {
              window.location.href = '/browse';
            }}
          />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <article
              key={item.id}
              className="flex flex-col rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden"
            >
              <Link
                to={`/items/${item.id}`}
                className="relative aspect-[4/3] w-full bg-[#F1F5F9] overflow-hidden block"
              >
                <SafeImage
                  src={item.coverImage}
                  alt={item.title}
                  className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                />
              </Link>

              <div className="flex flex-1 flex-col p-4">
                <p className="text-xs font-medium text-[#64748B] truncate">
                  {item.categoryName} · {item.locationText}
                </p>

                <Link
                  to={`/items/${item.id}`}
                  className="mt-1.5 font-display text-base font-semibold text-[#0F172A] hover:text-[#0F766E] line-clamp-2"
                >
                  {item.title}
                </Link>

                <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-[#F1F5F9]">
                  <span className="font-display tabular-nums text-base font-bold text-[#172554]">
                    {formatPkr(item.dailyPrice)}
                    <span className="text-xs font-normal text-[#64748B]"> / day</span>
                  </span>

                  <button
                    type="button"
                    disabled={removingId === item.id}
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove ${item.title} from saved`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#475569] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {removingId === item.id ? (
                      <BookmarkX className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Heart className="w-3.5 h-3.5 fill-[#0F766E] text-[#0F766E]" aria-hidden="true" />
                    )}
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
