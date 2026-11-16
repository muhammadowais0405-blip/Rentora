import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import type { Category } from '../../types/marketplace';
import { SafeImage } from '../common/SafeImage';

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      to={`/category/${category.slug}`}
      className="group flex flex-col rounded-2xl bg-white border border-[#E2E8F0] overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full bg-[#F1F5F9] overflow-hidden">
        <SafeImage
          src={category.imagePath}
          alt={category.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-[#172554] truncate group-hover:text-[#0F766E] transition-colors">
            {category.name}
          </h3>
          <p className="mt-0.5 text-xs text-[#64748B] font-mono-num">
            {category.listingCount} {category.listingCount === 1 ? 'listing' : 'listings'}
          </p>
        </div>
        <ArrowRight
          className="w-4 h-4 text-[#64748B] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[#0F766E]"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
