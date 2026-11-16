import type { MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { ListingSummary } from '../../types/marketplace';
import { formatPkr } from '../../utils/rentalMath';
import { SafeImage } from '../common/SafeImage';

interface ListingCardProps {
  item: ListingSummary;
}

export function ListingCard({ item }: ListingCardProps) {
  const { user, isFavorite, toggleFavorite } = useAuth();
  const navigate = useNavigate();
  const saved = isFavorite(item.id);

  const handleToggleFavorite = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) {
      navigate(`/login?next=/items/${item.id}`);
      return;
    }
    try {
      await toggleFavorite(item.id);
    } catch {
      // Ignore transient toggle error
    }
  };

  return (
    <Link
      to={`/items/${item.id}`}
      className="group flex flex-col rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#14B8A6]"
    >
      <div className="relative aspect-[4/3] w-full bg-[#F1F5F9] overflow-hidden">
        <SafeImage
          src={item.coverImage}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {item.isFeatured && (
          <span className="absolute top-3 left-3 rounded-md bg-[#FEF3C7] text-[#B45309] px-2.5 py-1 text-xs font-semibold tracking-tight shadow-xs">
            Featured
          </span>
        )}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={saved ? `Remove ${item.title} from saved` : `Save ${item.title}`}
          aria-pressed={saved}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 hover:bg-white text-[#0F172A] flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 ${
              saved ? 'fill-[#0F766E] text-[#0F766E]' : 'text-[#475569]'
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-[#64748B] truncate">
          {item.subcategory || item.categoryName}
          <span aria-hidden="true"> · </span>
          {item.locationText}
        </p>

        <h3 className="mt-1.5 font-display text-base font-semibold text-[#0F172A] leading-snug line-clamp-2 group-hover:text-[#0F766E] transition-colors">
          {item.title}
        </h3>

        <div className="mt-auto pt-3 flex items-baseline justify-between gap-2 border-t border-[#F1F5F9]">
          <div className="flex items-baseline gap-1">
            <span className="font-display tabular-nums text-base font-bold text-[#172554]">
              {formatPkr(item.dailyPrice)}
            </span>
            <span className="text-xs text-[#64748B]">/ day</span>
          </div>

          <div className="flex items-center gap-1 text-xs text-[#0F172A] shrink-0">
            <Star
              className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]"
              aria-hidden="true"
            />
            <span className="font-semibold tabular-nums">{item.rating.toFixed(1)}</span>
            {item.reviewCount > 0 && (
              <span className="text-[#64748B]">({item.reviewCount})</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
