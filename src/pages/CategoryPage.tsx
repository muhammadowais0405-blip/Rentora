import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { Category, ListingSummary, SortOption } from '../types/marketplace';
import { getCategories, getItems } from '../lib/api';
import { ListingCard } from '../components/listings/ListingCard';
import { EmptyState, ErrorBanner, SkeletonCard } from '../components/common/StateBlocks';

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<ListingSummary[]>([]);
  const [subcategory, setSubcategory] = useState('');
  const [sort, setSort] = useState<SortOption>('recommended');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    setSubcategory('');
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      getCategories(controller.signal),
      getItems({ category: slug, subcategory, sort }, controller.signal),
    ])
      .then(([cats, res]) => {
        const matched = cats.find((c) => c.slug === slug) ?? null;
        setCategory(matched);
        setItems(res.items);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load category.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug, subcategory, sort, retryTick]);

  return (
    <main>
      <section className="bg-[#172554] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EEAD4] hover:underline mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to all rentals</span>
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
            {category ? category.name : 'Category'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 max-w-2xl">
            {category
              ? category.description
              : 'Explore peer-to-peer rentals available in this category.'}
          </p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl self-start">
            <button
              type="button"
              onClick={() => setSubcategory('')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                subcategory === ''
                  ? 'bg-white text-[#172554] shadow-xs'
                  : 'text-[#475569] hover:text-[#0F172A]'
              }`}
            >
              All
            </button>
            {category?.subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSubcategory(sub)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  subcategory === sub
                    ? 'bg-white text-[#172554] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4">
            <span className="text-sm text-[#64748B] font-mono-num">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </span>
            <label htmlFor="category-sort-select" className="sr-only">
              Sort category items
            </label>
            <select
              id="category-sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="h-10 px-3 rounded-xl bg-white border border-[#E2E8F0] text-sm font-medium text-[#0F172A] cursor-pointer"
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Top Rated</option>
            </select>
          </div>
        </div>

        <div className="mt-8">
          {error && !loading ? (
            <ErrorBanner message={error} onRetry={() => setRetryTick((t) => t + 1)} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No listings match this subcategory"
              description="Reset the subcategory filter or view all rentals across Rentora."
              actionLabel="Show all in category"
              onAction={() => setSubcategory('')}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
