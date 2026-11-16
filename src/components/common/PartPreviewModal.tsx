import { useEffect } from 'react';
import { CheckCircle2, Sparkles, X } from 'lucide-react';

export interface PreviewModalContext {
  title: string;
  subtitle: string;
  partLabel: string;
  details?: Array<{ label: string; value: string }>;
  upcomingFeatures: string[];
}

interface PartPreviewModalProps {
  context: PreviewModalContext | null;
  onClose: () => void;
}

export function PartPreviewModal({ context, onClose }: PartPreviewModalProps) {
  useEffect(() => {
    if (!context) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [context, onClose]);

  if (!context) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-[20px] bg-white border border-[#E2E8F0] shadow-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#0F766E] mb-1">
              {context.partLabel}
            </p>
            <h2
              id="preview-modal-title"
              className="font-display text-xl sm:text-2xl font-bold text-[#172554]"
            >
              {context.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-[#64748B]">{context.subtitle}</p>

        {context.details && context.details.length > 0 && (
          <div className="mt-5 rounded-xl bg-[#F8FAFC] p-4 space-y-2.5">
            {context.details.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-[#64748B]">{row.label}</span>
                <span className="font-semibold text-[#0F172A] tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 pt-5 border-t border-[#E2E8F0]">
          <p className="text-xs font-semibold text-[#172554] flex items-center gap-1.5 mb-3">
            <Sparkles className="w-4 h-4 text-[#14B8A6]" aria-hidden="true" />
            <span>Included in next build parts</span>
          </p>
          <ul className="space-y-2">
            {context.upcomingFeatures.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-[#0F172A]">
                <CheckCircle2
                  className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap"
          >
            Got it, continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
