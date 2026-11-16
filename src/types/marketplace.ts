export type SortOption = 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc';

export type UserRole = 'user' | 'admin';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  emailVerifiedDemo: boolean;
  phoneVerifiedDemo: boolean;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  imagePath: string;
  listingCount: number;
  subcategories: string[];
}

export interface ListingSummary {
  id: number;
  ownerId: number;
  ownerName: string;
  categoryId: number;
  categoryName: string;
  categorySlug: string;
  subcategory: string;
  title: string;
  condition: string;
  dailyPrice: number;
  depositAmount: number;
  locationText: string;
  status: string;
  isFeatured: boolean;
  coverImage: string;
  rating: number;
  reviewCount: number;
  createdAt: string;
}

export interface ListingImage {
  id: number;
  filePath: string;
  isCover: boolean;
  sortOrder: number;
}

export interface ListingReview {
  id: number;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface BookedRange {
  startDate: string;
  endDate: string;
}

export interface ListingOwner {
  id: number;
  name: string;
  emailVerifiedDemo: boolean;
  phoneVerifiedDemo: boolean;
  memberSince: string;
  totalListings: number;
}

export interface ListingDetail extends ListingSummary {
  description: string;
  specs: Record<string, string>;
  images: ListingImage[];
  owner: ListingOwner;
  reviews: ListingReview[];
  bookedRanges: BookedRange[];
}

export interface BrowseFilters {
  q: string;
  category: string;
  subcategory: string;
  minPrice: string;
  maxPrice: string;
  sort: SortOption;
}

export interface AiListingDraft {
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedCategorySlug:
    | 'cameras-photography'
    | 'gaming-consoles'
    | 'bikes-cycles'
    | 'electronics-equipment';
  suggestedSubcategory: string;
  suggestedTags: string[];
  visibleAttributes: string[];
}

export interface AiSearchFilters {
  categorySlug: string | null;
  maxDailyPrice: number | null;
  minDailyPrice: number | null;
  keywords: string[];
  requestedDays: number | null;
  summary: string;
}

export interface AiRentalMatch {
  item: ListingSummary;
  reason: string;
  estimatedTotal: number | null;
  score: number;
}

export interface AiRentalSearchResponse {
  filters: AiSearchFilters;
  matches: AiRentalMatch[];
  usedFallback: boolean;
  notice?: string;
}

export type BookingStatus = 'pending' | 'approved' | 'declined' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid_demo';

export interface BookingSummary {
  id: number;
  listingId: number;
  listingTitle: string;
  listingCoverImage: string;
  listingLocation: string;
  renterId: number;
  renterName: string;
  ownerId: number;
  ownerName: string;
  startDate: string;
  endDate: string;
  rentalDays: number;
  dailyPriceSnapshot: number;
  rentalTotal: number;
  depositSnapshot: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paidDemoAt: string | null;
  renterNote: string;
  hasReviewed: boolean;
  createdAt: string;
}

export interface BookingStatusHistoryItem {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  changedByName: string | null;
  createdAt: string;
}

export interface BookingDetail extends BookingSummary {
  listingCategoryName: string;
  listingCondition: string;
  renterEmail: string;
  renterPhone: string;
  ownerEmail: string;
  ownerPhone: string;
  statusHistory: BookingStatusHistoryItem[];
  review: {
    id: number;
    rating: number;
    comment: string;
    createdAt: string;
  } | null;
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardOverview {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  pendingRequestsReceived: number;
  approvedUpcoming: number;
  completedRentals: number;
  totalEarnedDemo: number;
  unreadNotifications: number;
  activePromotionsCount: number;
}

export interface AdminListingItem {
  id: number;
  title: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  categoryName: string;
  subcategory: string;
  dailyPrice: number;
  depositAmount: number;
  locationText: string;
  condition: string;
  status: 'pending' | 'active' | 'hidden' | 'archived';
  isFeatured: boolean;
  coverImage: string;
  createdAt: string;
}

export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  emailVerifiedDemo: boolean;
  phoneVerifiedDemo: boolean;
  listingsCount: number;
  bookingsCount: number;
  createdAt: string;
}

export interface ListingReportItem {
  id: number;
  listingId: number;
  listingTitle: string;
  listingStatus: string;
  reporterName: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAt: string;
}

