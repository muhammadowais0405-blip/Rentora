import { AlertCircle, SearchX } from 'lucide-react';

export function SkeletonCard() {
  return (
    <div
      className="rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden animate-pulse"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] w-full bg-[#E2E8F0]" />
      <div className="p-4 space-y-3">
        <div className="h-3 w-28 rounded bg-[#E2E8F0]" />
        <div className="h-5 w-4/5 rounded bg-[#E2E8F0]" />
        <div className="pt-2 flex items-center justify-between">
          <div className="h-4 w-24 rounded bg-[#E2E8F0]" />
          <div className="h-4 w-12 rounded bg-[#E2E8F0]" />
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] px-6 py-12 text-center">
      <div className="mx-auto w-12 h-12 rounded-xl bg-[#F1F5F9] flex items-center justify-center text-[#0F766E]">
        <SearchX className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold text-[#172554]">{title}</h3>
      <p className="mt-2 text-sm text-[#64748B] max-w-md mx-auto">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-white border border-[#FECACA] px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">Unable to load listings</p>
          <p className="text-sm text-[#64748B] mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-4 py-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-[#F1F5F9] text-sm font-semibold text-[#0F172A] transition-colors whitespace-nowrap self-start sm:self-center"
        >
          Try again
        </button>
      )}
    </div>
  );
}
