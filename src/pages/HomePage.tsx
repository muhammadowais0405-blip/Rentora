import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarCheck2, Handshake, Search } from 'lucide-react';
import type { Category, ListingSummary } from '../types/marketplace';
import { getCategories, getItems } from '../lib/api';
import { CategoryCard } from '../components/listings/CategoryCard';
import { ListingCard } from '../components/listings/ListingCard';
import { SafeImage } from '../components/common/SafeImage';
import { ErrorBanner, SkeletonCard } from '../components/common/StateBlocks';

const HERO_IMAGE = '/src/assets/images/hero_rental_gear_1794844411562.jpg';

export function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredItems, setFeaturedItems] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      getCategories(controller.signal),
      getItems({ featured: true }, controller.signal),
    ])
      .then(([cats, itemsPayload]) => {
        setCategories(cats);
        setFeaturedItems(itemsPayload.items.slice(0, 4));
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load marketplace data.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [retryTick]);

  const handleHeroSearch = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    navigate(trimmed ? `/browse?q=${encodeURIComponent(trimmed)}` : '/browse');
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#172554] via-[#1E3A5F] to-[#114E53] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#5EEAD4]">
                Peer-to-Peer Rental Marketplace
              </p>
              <h1
                className="mt-3 font-display text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-white"
                style={{ textWrap: 'balance' }}
              >
                Rent smarter. Spend less.
              </h1>
              <p className="mt-4 text-base sm:text-lg text-slate-200 leading-relaxed max-w-xl">
                Borrow cameras, gaming consoles, bikes, and electronics nearby for short
                projects or weekends—or earn daily income from belongings you already own.
              </p>

              <form
                onSubmit={handleHeroSearch}
                className="mt-7 flex flex-col sm:flex-row gap-3 max-w-xl"
                role="search"
                aria-label="Search rentals"
              >
                <div className="relative flex-1">
                  <Search
                    className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <label htmlFor="hero-search-input" className="sr-only">
                    Search cameras, consoles, bikes, or projectors
                  </label>
                  <input
                    id="hero-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Sony A7, PS5, road bike, projector..."
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-white text-[#0F172A] placeholder:text-[#64748B] text-sm border border-transparent focus:border-[#14B8A6] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="h-12 px-6 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Explore rentals
                </button>
              </form>

              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-slate-300">
                <span>4 categories</span>
                <span aria-hidden="true">·</span>
                <span>Daily PKR rates</span>
                <span aria-hidden="true">·</span>
                <Link to="/ai-finder" className="text-[#5EEAD4] font-semibold hover:underline">
                  Try AI Rental Finder
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[240px] sm:min-h-[300px] lg:min-h-[360px] rounded-2xl overflow-hidden border border-white/15 bg-[#0F172A] shadow-xl">
                <SafeImage
                  src={HERO_IMAGE}
                  alt="Mirrorless camera, wireless gaming controller, and aluminum laptop available on Rentora"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Four Categories Section */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
              Browse by category
            </h2>
            <p className="mt-1 text-sm sm:text-base text-[#64748B]">
              Focused gear categories built for student shoots, weekend gaming, rides, and demos.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:text-[#0D5F59] whitespace-nowrap"
          >
            <span>See all rentals</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {error && !loading ? (
          <ErrorBanner message={error} onRetry={() => setRetryTick((t) => t + 1)} />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Listings Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
              Featured rentals
            </h2>
            <p className="mt-1 text-sm sm:text-base text-[#64748B]">
              Popular, well-maintained items ready for multi-day pickup.
            </p>
          </div>
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:text-[#0D5F59] whitespace-nowrap"
          >
            <span>Browse catalog</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : !error ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item) => (
              <ListingCard key={item.id} item={item} />
            ))}
          </div>
        ) : null}
      </section>

      {/* How Rentora Works + Owner CTA */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="rounded-3xl bg-white border border-[#E2E8F0] p-6 sm:p-10">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
              How Rentora works
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#64748B]">
              Designed specifically for temporary rentals—dates, transparent daily rates, and
              owner confirmation in three simple steps.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
                <Search className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-[#172554]">
                01. Find an item
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                Browse four dedicated categories or filter by daily PKR budget to find equipment
                near your campus or neighborhood.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
                <CalendarCheck2 className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-[#172554]">
                02. Pick dates &amp; request
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                Review the daily rate, estimated rental total, and illustrative security deposit
                before sending a booking request.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center">
                <Handshake className="w-5 h-5" aria-hidden="true" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-[#172554]">
                03. Meet &amp; return
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                Once the owner approves your dates, pick up the gear for your project or weekend
                and return it in the same condition.
              </p>
            </div>
          </div>

          <div className="mt-10 rounded-2xl bg-[#172554] text-white p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                Have something sitting unused? List it on Rentora.
              </h3>
              <p className="mt-1.5 text-sm text-slate-300 max-w-xl">
                Turn your camera kit, console, or road bike into extra income with owner-controlled
                approval and AI-assisted listing drafts.
              </p>
            </div>
            <Link
              to="/list-item"
              className="px-6 py-3 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-[#0F172A] font-semibold text-sm transition-colors whitespace-nowrap shrink-0 self-start md:self-center"
            >
              List an item
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
