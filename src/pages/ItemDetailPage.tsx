import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Edit3,
  Heart,
  MapPin,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { ListingDetail } from '../types/marketplace';
import { createBooking, getItemDetail } from '../lib/api';
import {
  calculateBookingEstimate,
  formatPkr,
  getDefaultRentalDates,
} from '../utils/rentalMath';
import { SafeImage } from '../components/common/SafeImage';
import { ErrorBanner } from '../components/common/StateBlocks';

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isFavorite, toggleFavorite, refreshUserActivity } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<ListingDetail | null>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const defaults = useMemo(() => getDefaultRentalDates(), []);
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [renterNote, setRenterNote] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  useEffect(() => {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError('Invalid listing ID.');
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setSelectedImageIdx(0);

    getItemDetail(numericId, controller.signal)
      .then((detail) => setItem(detail))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load listing.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, retryTick]);

  const estimate = useMemo(() => {
    if (!item) return null;
    return calculateBookingEstimate(
      item.dailyPrice,
      item.depositAmount,
      startDate,
      endDate,
      item.bookedRanges,
    );
  }, [item, startDate, endDate]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-pulse">
          <div className="lg:col-span-7 space-y-4">
            <div className="aspect-[4/3] w-full rounded-2xl bg-[#E2E8F0]" />
            <div className="h-8 w-2/3 rounded bg-[#E2E8F0]" />
            <div className="h-24 w-full rounded bg-[#E2E8F0]" />
          </div>
          <div className="lg:col-span-5">
            <div className="h-80 w-full rounded-2xl bg-[#E2E8F0]" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !item) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ErrorBanner
          message={error ?? 'Listing not found.'}
          onRetry={() => setRetryTick((t) => t + 1)}
        />
        <div className="mt-6">
          <Link to="/browse" className="text-sm font-semibold text-[#0F766E] hover:underline">
            Return to browse rentals
          </Link>
        </div>
      </main>
    );
  }

  const gallery = item.images.length > 0 ? item.images : [{ id: 0, filePath: item.coverImage, isCover: true, sortOrder: 0 }];
  const activeImage = gallery[selectedImageIdx] ?? gallery[0];

  const isOwner = Boolean(user && user.id === item.ownerId);
  const saved = isFavorite(item.id);

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate(`/login?next=/items/${item.id}`);
      return;
    }
    try {
      await toggleFavorite(item.id);
    } catch {
      // Ignore transient error
    }
  };

  const handleRequestToRent = async () => {
    if (!estimate || !estimate.valid) return;
    if (!user) {
      navigate(`/login?next=/items/${item.id}`);
      return;
    }
    setSubmittingBooking(true);
    setBookingError(null);
    try {
      const created = await createBooking({
        listingId: item.id,
        startDate,
        endDate,
        renterNote,
      });
      await refreshUserActivity();
      navigate(`/bookings/${created.id}`);
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : 'Unable to send booking request.',
      );
    } finally {
      setSubmittingBooking(false);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-[#64748B] mb-6 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-[#0F766E]">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <Link to={`/category/${item.categorySlug}`} className="hover:text-[#0F766E]">
          {item.categoryName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="text-[#0F172A] font-medium truncate">{item.title}</span>
      </nav>

      {isOwner && (
        <div className="mb-6 rounded-2xl bg-[#F0FDFA] border border-[#99F6E4] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-[#0F766E] font-medium">
            {item.status === 'pending'
              ? 'This listing is currently pending moderator approval and is visible only to you.'
              : 'You own this listing.'}
          </p>
          <Link
            to={`/items/${item.id}/edit`}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#172554] hover:underline"
          >
            <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit listing</span>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Gallery, Details, Specs, Owner, Reviews */}
        <div className="lg:col-span-7 space-y-8">
          {/* Gallery */}
          <div>
            <div className="aspect-[4/3] w-full rounded-2xl bg-[#F1F5F9] border border-[#E2E8F0] overflow-hidden">
              <SafeImage
                src={activeImage.filePath}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
            {gallery.length > 1 && (
              <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1">
                {gallery.map((img, idx) => (
                  <button
                    key={img.id || idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    aria-label={`View photo ${idx + 1} of ${item.title}`}
                    className={`w-20 aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 transition-colors cursor-pointer ${
                      idx === selectedImageIdx
                        ? 'border-[#0F766E]'
                        : 'border-[#E2E8F0] opacity-75 hover:opacity-100'
                    }`}
                  >
                    <SafeImage
                      src={img.filePath}
                      alt={`${item.title} thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="pb-6 border-b border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#64748B]">
              <span>{item.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span>{item.subcategory}</span>
              <span aria-hidden="true">·</span>
              <span>Condition: {item.condition}</span>
              {item.isFeatured && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#B45309] font-semibold">Featured</span>
                </>
              )}
            </div>

            <div className="mt-2 flex items-start justify-between gap-4">
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
                {item.title}
              </h1>
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-pressed={saved}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold shrink-0 transition-colors cursor-pointer ${
                  saved
                    ? 'border-[#0F766E] bg-[#F0FDFA] text-[#0F766E]'
                    : 'border-[#E2E8F0] bg-white text-[#475569] hover:text-[#172554]'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${saved ? 'fill-[#0F766E] text-[#0F766E]' : ''}`}
                  aria-hidden="true"
                />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#475569]">
              <span className="inline-flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" aria-hidden="true" />
                <span className="font-semibold text-[#0F172A] font-mono-num">
                  {item.rating.toFixed(1)}
                </span>
                <span>
                  ({item.reviewCount} {item.reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                <span>{item.locationText}</span>
              </span>
            </div>
          </div>

          {/* About This Item */}
          <section>
            <h2 className="font-display text-xl font-semibold text-[#172554]">
              About this item
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#334155]">{item.description}</p>
          </section>

          {/* Specifications */}
          {Object.keys(item.specs).length > 0 && (
            <section className="pt-6 border-t border-[#E2E8F0]">
              <h2 className="font-display text-xl font-semibold text-[#172554]">
                Specifications &amp; included gear
              </h2>
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                {Object.entries(item.specs).map(([key, val]) => (
                  <div key={key} className="pb-3 border-b border-[#F1F5F9]">
                    <dt className="text-xs font-medium text-[#64748B]">{key}</dt>
                    <dd className="mt-1 text-sm font-medium text-[#0F172A]">{val}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Owner Profile Strip */}
          <section className="pt-6 border-t border-[#E2E8F0]">
            <h2 className="font-display text-xl font-semibold text-[#172554]">Owner details</h2>
            <div className="mt-4 rounded-2xl bg-white border border-[#E2E8F0] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#172554] text-white font-display font-bold flex items-center justify-center shrink-0">
                  {item.owner.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <p className="font-display text-base font-semibold text-[#0F172A]">
                    {item.owner.name}
                  </p>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {item.owner.totalListings} active{' '}
                    {item.owner.totalListings === 1 ? 'listing' : 'listings'}
                    <span aria-hidden="true"> · </span>
                    Member since {item.owner.memberSince.slice(0, 7)}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#0F766E]">
                {item.owner.emailVerifiedDemo && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    Email verified (demo)
                  </span>
                )}
                {item.owner.phoneVerifiedDemo && (
                  <span className="inline-flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    Phone verified (demo)
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className="pt-6 border-t border-[#E2E8F0]">
            <h2 className="font-display text-xl font-semibold text-[#172554]">
              Renter reviews ({item.reviews.length})
            </h2>
            {item.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-[#64748B]">
                No completed demo reviews yet for this listing.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {item.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-2xl bg-white border border-[#E2E8F0] p-5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-sm text-[#0F172A]">
                        {review.reviewerName}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-[#0F172A]">
                        <Star
                          className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"
                          aria-hidden="true"
                        />
                        <span className="font-mono-num font-semibold">{review.rating}.0</span>
                        <span className="text-[#64748B] ml-1">{review.createdAt}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#475569]">
                      {review.comment}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Sticky Booking Estimator */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24">
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 shadow-xs">
            <div className="flex items-baseline justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display tabular-nums text-2xl font-bold text-[#172554]">
                  {formatPkr(item.dailyPrice)}
                </span>
                <span className="text-sm text-[#64748B]">/ day</span>
              </div>
              <span className="text-xs font-medium text-[#0F766E]">
                Availability confirmed by owner
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pickup-date"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Pickup date
                </label>
                <input
                  id="pickup-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm tabular-nums text-[#0F172A]"
                />
              </div>
              <div>
                <label
                  htmlFor="return-date"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Return date
                </label>
                <input
                  id="return-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm tabular-nums text-[#0F172A]"
                />
              </div>
            </div>

            {item.bookedRanges.length > 0 && (
              <div className="mt-4 rounded-xl bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                <p className="font-semibold text-[#172554] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#0F766E]" aria-hidden="true" />
                  <span>Booked demo dates</span>
                </p>
                <ul className="mt-1 space-y-0.5 tabular-nums">
                  {item.bookedRanges.map((range, i) => (
                    <li key={i}>
                      {range.startDate} to {range.endDate}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {estimate && !estimate.valid && estimate.error && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#B91C1C] flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{estimate.error}</span>
              </div>
            )}

            {estimate && (
              <div className="mt-5 pt-5 border-t border-[#E2E8F0] space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-[#475569]">
                  <span>
                    {formatPkr(item.dailyPrice)} × {estimate.days}{' '}
                    {estimate.days === 1 ? 'day' : 'days'}
                  </span>
                  <span className="tabular-nums font-semibold text-[#0F172A]">
                    {formatPkr(estimate.rentalTotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#475569]">
                  <span>Refundable deposit (demo)</span>
                  <span className="tabular-nums font-medium text-[#0F172A]">
                    {formatPkr(estimate.depositAmount)}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between">
                  <span className="font-semibold text-[#172554]">Estimated rental total</span>
                  <span className="font-display tabular-nums text-lg font-bold text-[#172554]">
                    {formatPkr(estimate.rentalTotal)}
                  </span>
                </div>
              </div>
            )}

            {!isOwner && (
              <div className="mt-4">
                <label
                  htmlFor="renter-note"
                  className="block text-xs font-semibold text-[#475569] mb-1.5"
                >
                  Note for owner (optional)
                </label>
                <textarea
                  id="renter-note"
                  rows={2}
                  maxLength={400}
                  value={renterNote}
                  onChange={(e) => setRenterNote(e.target.value)}
                  placeholder="Share preferred pickup time or project details..."
                  className="w-full p-2.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
                />
              </div>
            )}

            {bookingError && (
              <div
                role="alert"
                className="mt-4 rounded-xl bg-[#FEF2F2] p-3 text-xs text-[#B91C1C] flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{bookingError}</span>
              </div>
            )}

            {isOwner ? (
              <div className="mt-6 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 text-xs text-[#475569] text-center">
                This is your listing. Switch to another demo account to test sending a booking request.
              </div>
            ) : !user ? (
              <Link
                to={`/login?next=/items/${item.id}`}
                className="mt-6 w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors flex items-center justify-center"
              >
                Sign in to request rental
              </Link>
            ) : (
              <button
                type="button"
                disabled={!estimate?.valid || submittingBooking}
                onClick={handleRequestToRent}
                className="mt-6 w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] disabled:bg-[#CBD5E1] disabled:text-[#64748B] disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {submittingBooking ? 'Sending request...' : 'Request to rent'}
              </button>
            )}

            <p className="mt-3 text-xs text-center text-[#64748B]">
              Demo prototype only · Deposits and payments are illustrative and not charged.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
