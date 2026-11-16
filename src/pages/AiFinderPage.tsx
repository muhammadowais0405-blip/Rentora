import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Info, Search, Sparkles } from 'lucide-react';
import type { AiRentalSearchResponse } from '../types/marketplace';
import { runAiRentalSearch } from '../lib/api';
import { formatPkr } from '../utils/rentalMath';
import { ListingCard } from '../components/listings/ListingCard';
import { EmptyState, ErrorBanner, SkeletonCard } from '../components/common/StateBlocks';

const SAMPLE_PROMPTS = [
  'I need a camera for a university photography assignment for two days, preferably under Rs. 2,500 per day.',
  'PlayStation 5 or console with controllers for a 2-day weekend hangout.',
  'Portable projector for a thesis presentation under Rs. 2,000 per day.',
];

const CATEGORY_LABELS: Record<string, string> = {
  'cameras-photography': 'Cameras & Photography',
  'gaming-consoles': 'Gaming Consoles',
  'bikes-cycles': 'Bikes & Cycles',
  'electronics-equipment': 'Electronics & Equipment',
};

export function AiFinderPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiRentalSearchResponse | null>(null);

  const executeSearch = async (textToSearch: string) => {
    const trimmed = textToSearch.trim();
    if (trimmed.length < 3) {
      setError('Describe what you need in at least 3 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await runAiRentalSearch(trimmed);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to run AI Rental Finder.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void executeSearch(query);
  };

  const handleExampleClick = (promptText: string) => {
    setQuery(promptText);
    void executeSearch(promptText);
  };

  return (
    <main>
      <section className="bg-gradient-to-br from-[#172554] via-[#1E3A5F] to-[#114E53] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5EEAD4]">
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>AI Rental Finder</span>
          </p>
          <h1
            className="mt-2 font-display text-3xl sm:text-4xl font-bold text-white"
            style={{ textWrap: 'balance' }}
          >
            Describe what you need in plain language.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-200 max-w-2xl leading-relaxed">
            Tell Rentora your project, rental duration, and daily PKR budget. AI extracts search
            filters and matches only real listings stored in our SQLite catalog.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-3">
            <label htmlFor="ai-finder-input" className="sr-only">
              Describe the gear you want to rent
            </label>
            <textarea
              id="ai-finder-input"
              rows={3}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Example: I need a camera for a university photography assignment for two days, preferably under Rs. 2,500 per day."
              className="w-full rounded-2xl bg-white text-[#0F172A] placeholder:text-[#64748B] p-4 text-sm sm:text-base border border-transparent focus:border-[#14B8A6] focus:outline-none"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-300">
                Recommendations never reserve items automatically or fabricate prices.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="h-11 px-6 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] disabled:opacity-60 text-[#0F172A] text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
              >
                <Search className="w-4 h-4" aria-hidden="true" />
                <span>{loading ? 'Finding matches...' : 'Find matching rentals'}</span>
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs font-semibold text-slate-300 mb-2.5">Try an example request:</p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_PROMPTS.map((sample) => (
                <button
                  key={sample}
                  type="button"
                  disabled={loading}
                  onClick={() => handleExampleClick(sample)}
                  className="text-left px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-100 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {error && (
          <div className="mb-8 space-y-4">
            <ErrorBanner message={error} onRetry={() => void executeSearch(query)} />
            <div className="text-sm">
              <Link to="/browse" className="font-semibold text-[#0F766E] hover:underline">
                Browse the standard catalog without AI
              </Link>
            </div>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && result && (
          <div className="space-y-8">
            {/* Extracted Filter Summary */}
            <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#172554]">
                    Interpreted search criteria
                  </h2>
                  <p className="mt-1 text-sm text-[#475569]">{result.filters.summary}</p>
                </div>
                <Link
                  to="/browse"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0F766E] hover:underline whitespace-nowrap"
                >
                  <span>Open standard filters</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>

              <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-[#475569]">
                <span>
                  Category:{' '}
                  <strong className="text-[#0F172A]">
                    {result.filters.categorySlug
                      ? CATEGORY_LABELS[result.filters.categorySlug] ?? result.filters.categorySlug
                      : 'All categories'}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Max budget:{' '}
                  <strong className="text-[#0F172A] tabular-nums">
                    {result.filters.maxDailyPrice !== null
                      ? `${formatPkr(result.filters.maxDailyPrice)} / day`
                      : 'Any'}
                  </strong>
                </span>
                {result.filters.requestedDays !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Duration:{' '}
                      <strong className="text-[#0F172A] tabular-nums">
                        {result.filters.requestedDays}{' '}
                        {result.filters.requestedDays === 1 ? 'day' : 'days'}
                      </strong>
                    </span>
                  </>
                )}
                {result.filters.keywords.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      Keywords:{' '}
                      <strong className="text-[#0F172A]">
                        {result.filters.keywords.join(', ')}
                      </strong>
                    </span>
                  </>
                )}
              </div>

              {result.notice && (
                <p className="mt-3 text-xs text-[#64748B] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#0F766E] shrink-0" aria-hidden="true" />
                  <span>{result.notice}</span>
                </p>
              )}
            </div>

            {/* Matching Listings */}
            {result.matches.length === 0 ? (
              <EmptyState
                title="No database listings matched those exact constraints"
                description="Try increasing your daily PKR budget, broadening your description, or browsing the full catalog."
                actionLabel="Try higher budget or reset"
                onAction={() => {
                  setResult(null);
                  setQuery('');
                }}
              />
            ) : (
              <div>
                <p className="text-sm text-[#64748B] mb-5">
                  Showing{' '}
                  <span className="font-semibold text-[#0F172A] tabular-nums">
                    {result.matches.length}
                  </span>{' '}
                  verified database {result.matches.length === 1 ? 'match' : 'matches'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {result.matches.map((match) => (
                    <div key={match.item.id} className="flex flex-col gap-2">
                      <ListingCard item={match.item} />
                      <p className="px-1 text-xs text-[#0F766E] font-medium leading-relaxed">
                        {match.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !result && !error && (
          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-8 text-center">
            <h2 className="font-display text-lg font-semibold text-[#172554]">
              Ready when you are
            </h2>
            <p className="mt-2 text-sm text-[#64748B] max-w-lg mx-auto">
              Enter a natural-language description above or pick one of the example prompts to see
              real listings matched from Rentora&apos;s SQLite database.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
