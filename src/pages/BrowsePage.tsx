import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Category, ListingSummary, SortOption } from '../types/marketplace';
import { getCategories, getItems } from '../lib/api';
import { buildBrowseSearchParams } from '../utils/rentalMath';
import { ListingCard } from '../components/listings/ListingCard';
import { EmptyState, ErrorBanner, SkeletonCard } from '../components/common/StateBlocks';

const BUDGET_PRESETS = [
  { label: 'Under Rs. 1,500', value: '1500' },
  { label: 'Under Rs. 2,500', value: '2500' },
  { label: 'Under Rs. 3,500', value: '3500' },
];

export function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const minPrice = searchParams.get('minPrice') ?? '';
  const maxPrice = searchParams.get('maxPrice') ?? '';
  const sort = (searchParams.get('sort') as SortOption | null) ?? 'recommended';

  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then(setCategories)
      .catch(() => {
        // Categories fallback handled gracefully if items still load
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getItems({ q, category, minPrice, maxPrice, sort }, controller.signal)
      .then((res) => setItems(res.items))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load listings.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [q, category, minPrice, maxPrice, sort, retryTick]);

  const updateFilter = (
    updates: Partial<{
      q: string;
      category: string;
      minPrice: string;
      maxPrice: string;
      sort: SortOption;
    }>,
  ) => {
    const next = buildBrowseSearchParams({
      q: updates.q !== undefined ? updates.q : q,
      category: updates.category !== undefined ? updates.category : category,
      minPrice: updates.minPrice !== undefined ? updates.minPrice : minPrice,
      maxPrice: updates.maxPrice !== undefined ? updates.maxPrice : maxPrice,
      sort: updates.sort !== undefined ? updates.sort : sort,
    });
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchDraft('');
    setSearchParams(new URLSearchParams());
    setMobileFiltersOpen(false);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateFilter({ q: searchDraft });
  };

  const hasActiveFilters = Boolean(q || category || minPrice || maxPrice || sort !== 'recommended');

  const filterPanelContent = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-[#172554]">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-[#0F766E] hover:text-[#0D5F59] cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div>
        <p className="text-xs font-semibold text-[#475569] mb-2.5">Category</p>
        <div className="space-y-1.5" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => {
              updateFilter({ category: '' });
              setMobileFiltersOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
              category === ''
                ? 'bg-[#CCFBF1] text-[#0F766E] font-semibold'
                : 'text-[#0F172A] hover:bg-[#F1F5F9]'
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                updateFilter({ category: cat.slug });
                setMobileFiltersOpen(false);
              }}
              className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-xl text-sm transition-colors cursor-pointer ${
                category === cat.slug
                  ? 'bg-[#CCFBF1] text-[#0F766E] font-semibold'
                  : 'text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              <span className="truncate">{cat.name}</span>
              <span className="text-xs font-mono-num text-[#64748B] ml-2">
                {cat.listingCount}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Daily Budget Filter */}
      <div className="pt-5 border-t border-[#E2E8F0]">
        <p className="text-xs font-semibold text-[#475569] mb-2.5">Daily price (PKR)</p>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="min-price-input" className="block text-xs text-[#64748B] mb-1">
              Min Rs.
            </label>
            <input
              id="min-price-input"
              type="number"
              min={0}
              step={100}
              value={minPrice}
              onChange={(e) => updateFilter({ minPrice: e.target.value })}
              placeholder="0"
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm font-mono-num text-[#0F172A]"
            />
          </div>
          <div>
            <label htmlFor="max-price-input" className="block text-xs text-[#64748B] mb-1">
              Max Rs.
            </label>
            <input
              id="max-price-input"
              type="number"
              min={0}
              step={100}
              value={maxPrice}
              onChange={(e) => updateFilter({ maxPrice: e.target.value })}
              placeholder="Any"
              className="w-full h-10 px-3 rounded-xl border border-[#E2E8F0] bg-white text-sm font-mono-num text-[#0F172A]"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {BUDGET_PRESETS.map((preset) => {
            const active = maxPrice === preset.value && !minPrice;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() =>
                  updateFilter({ minPrice: '', maxPrice: active ? '' : preset.value })
                }
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'border-[#0F766E] bg-[#CCFBF1] text-[#0F766E]'
                    : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Top Search & Sort Header */}
      <div className="flex flex-col gap-5 pb-6 border-b border-[#E2E8F0]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#172554]">
              Browse rentals
            </h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Explore available gear stored in the Rentora catalog and compare daily PKR rates.
            </p>
          </div>
          <Link
            to="/ai-finder"
            className="text-sm font-semibold text-[#0F766E] hover:underline whitespace-nowrap"
          >
            Need help choosing? Try AI Rental Finder
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2.5" role="search">
            <div className="relative flex-1">
              <Search
                className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <label htmlFor="browse-search-input" className="sr-only">
                Search listings
              </label>
              <input
                id="browse-search-input"
                type="search"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Search by item name, location, or gear type..."
                className="w-full h-11 pl-10 pr-9 rounded-xl bg-white border border-[#E2E8F0] text-sm text-[#0F172A] placeholder:text-[#64748B]"
              />
              {searchDraft && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft('');
                    updateFilter({ q: '' });
                  }}
                  aria-label="Clear search text"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-[#64748B] hover:text-[#0F172A]"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden h-11 px-4 rounded-xl bg-white border border-[#E2E8F0] text-sm font-semibold text-[#172554] inline-flex items-center gap-2 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              <span>Filters</span>
            </button>

            <label htmlFor="browse-sort-select" className="sr-only">
              Sort rentals
            </label>
            <select
              id="browse-sort-select"
              value={sort}
              onChange={(e) => updateFilter({ sort: e.target.value as SortOption })}
              className="h-11 px-3.5 rounded-xl bg-white border border-[#E2E8F0] text-sm font-medium text-[#0F172A] cursor-pointer"
            >
              <option value="recommended">Sort: Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="hidden lg:block lg:col-span-3">
          <div className="sticky top-24 rounded-2xl bg-white border border-[#E2E8F0] p-5">
            {filterPanelContent}
          </div>
        </aside>

        <section className="lg:col-span-9" aria-label="Search results">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <p className="text-sm text-[#64748B]">
              <span className="font-semibold text-[#0F172A] font-mono-num">{items.length}</span>{' '}
              {items.length === 1 ? 'rental found' : 'rentals found'}
              {q ? ` for "${q}"` : ''}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs font-semibold text-[#0F766E] hover:underline cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {error && !loading ? (
            <ErrorBanner message={error} onRetry={() => setRetryTick((t) => t + 1)} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No matching rentals found"
              description="Try broadening your search terms, removing the maximum daily price cap, or switching categories."
              actionLabel="Clear filters"
              onAction={clearAllFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {items.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#0F172A]/60 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Filter options"
        >
          <div className="w-full max-w-xs bg-white h-full p-6 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E2E8F0]">
              <span className="font-display text-lg font-bold text-[#172554]">Filter rentals</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="p-2 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {filterPanelContent}
          </div>
        </div>
      )}
    </main>
  );
}
