import type {
  AdminListingItem,
  AdminUserSummary,
  AiListingDraft,
  AiRentalSearchResponse,
  AppNotification,
  AuthUser,
  BookingDetail,
  BookingStatus,
  BookingSummary,
  Category,
  DashboardOverview,
  ListingDetail,
  ListingReportItem,
  ListingSummary,
} from '../types/marketplace';

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore non-JSON error body
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function getCategories(signal?: AbortSignal): Promise<Category[]> {
  const data = await requestJson<{ categories: Category[] }>('/api/categories', { signal });
  return data.categories;
}

export interface ItemsQuery {
  q?: string;
  category?: string;
  subcategory?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  featured?: boolean;
}

export async function getItems(
  query: ItemsQuery = {},
  signal?: AbortSignal,
): Promise<{ items: ListingSummary[]; total: number }> {
  const params = new URLSearchParams();
  if (query.q?.trim()) params.set('q', query.q.trim());
  if (query.category?.trim()) params.set('category', query.category.trim());
  if (query.subcategory?.trim()) params.set('subcategory', query.subcategory.trim());
  if (query.minPrice?.trim()) params.set('minPrice', query.minPrice.trim());
  if (query.maxPrice?.trim()) params.set('maxPrice', query.maxPrice.trim());
  if (query.sort?.trim()) params.set('sort', query.sort.trim());
  if (query.featured) params.set('featured', '1');

  const qs = params.toString();
  const url = qs ? `/api/items?${qs}` : '/api/items';
  return requestJson<{ items: ListingSummary[]; total: number }>(url, { signal });
}

export async function getItemDetail(id: number, signal?: AbortSignal): Promise<ListingDetail> {
  const data = await requestJson<{ item: ListingDetail }>(`/api/items/${id}`, { signal });
  return data.item;
}

// Auth
export async function getCurrentUser(): Promise<AuthUser | null> {
  const data = await requestJson<{ user: AuthUser | null }>('/api/auth/me');
  return data.user;
}

export async function loginWithEmail(email: string, password: string): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

export async function switchDemoAccount(
  email: 'renter@rentora.demo' | 'owner@rentora.demo' | 'admin@rentora.demo',
): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>('/api/auth/demo-switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  return data.user;
}

export async function registerDemoAccount(payload: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function logoutSession(): Promise<void> {
  await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function updateUserProfile(name: string, phone: string): Promise<AuthUser> {
  const data = await requestJson<{ user: AuthUser }>('/api/auth/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone }),
  });
  return data.user;
}

// Listing Management & Uploads
export async function uploadListingImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('image', file);
  const data = await requestJson<{ filePath: string }>('/api/upload', {
    method: 'POST',
    body: form,
  });
  return data.filePath;
}

export interface SaveListingPayload {
  title: string;
  categorySlug: string;
  subcategory: string;
  description: string;
  condition: 'Like New' | 'Excellent' | 'Good';
  dailyPrice: number;
  depositAmount: number;
  locationText: string;
  specs: Record<string, string>;
  images: Array<{ filePath: string; isCover: boolean }>;
}

export async function createListing(
  payload: SaveListingPayload,
): Promise<{ id: number; status: string }> {
  return requestJson<{ id: number; status: string }>('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateListing(
  id: number,
  payload: SaveListingPayload,
): Promise<{ id: number; ok: boolean }> {
  return requestJson<{ id: number; ok: boolean }>(`/api/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function archiveListing(id: number): Promise<void> {
  await requestJson<{ ok: boolean }>(`/api/items/${id}`, { method: 'DELETE' });
}

export async function getMyListings(): Promise<ListingSummary[]> {
  const data = await requestJson<{ items: ListingSummary[] }>('/api/my-listings');
  return data.items;
}

// AI Features
export async function generateAiDraft(params: {
  imageFile?: File;
  existingImagePath?: string;
  ownerNotes: string;
}): Promise<AiListingDraft> {
  const form = new FormData();
  form.append('ownerNotes', params.ownerNotes);
  if (params.imageFile) {
    form.append('image', params.imageFile);
  } else if (params.existingImagePath) {
    form.append('existingImagePath', params.existingImagePath);
  }
  const data = await requestJson<{ draft: AiListingDraft }>('/api/ai/listing-draft', {
    method: 'POST',
    body: form,
  });
  return data.draft;
}

export async function runAiRentalSearch(query: string): Promise<AiRentalSearchResponse> {
  return requestJson<AiRentalSearchResponse>('/api/ai/rental-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
}

// Favorites
export async function getFavorites(): Promise<{ items: ListingSummary[]; ids: number[] }> {
  return requestJson<{ items: ListingSummary[]; ids: number[] }>('/api/favorites');
}

export async function addFavorite(listingId: number): Promise<void> {
  await requestJson<{ saved: boolean }>(`/api/favorites/${listingId}`, { method: 'POST' });
}

export async function removeFavorite(listingId: number): Promise<void> {
  await requestJson<{ saved: boolean }>(`/api/favorites/${listingId}`, { method: 'DELETE' });
}

// Bookings & Demo Payment
export async function createBooking(payload: {
  listingId: number;
  startDate: string;
  endDate: string;
  renterNote?: string;
}): Promise<{
  id: number;
  status: BookingStatus;
  rentalDays: number;
  rentalTotal: number;
  depositSnapshot: number;
}> {
  return requestJson('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getMyBookings(): Promise<BookingSummary[]> {
  const data = await requestJson<{ bookings: BookingSummary[] }>('/api/bookings/mine');
  return data.bookings;
}

export async function getReceivedBookings(): Promise<BookingSummary[]> {
  const data = await requestJson<{ bookings: BookingSummary[] }>('/api/bookings/received');
  return data.bookings;
}

export async function getBookingDetail(id: number): Promise<BookingDetail> {
  const data = await requestJson<{ booking: BookingDetail }>(`/api/bookings/${id}`);
  return data.booking;
}

export async function updateBookingStatus(
  id: number,
  status: Exclude<BookingStatus, 'pending'>,
): Promise<{ id: number; status: BookingStatus }> {
  return requestJson(`/api/bookings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function confirmDemoPayment(
  id: number,
): Promise<{ id: number; paymentStatus: 'paid_demo' }> {
  return requestJson(`/api/bookings/${id}/pay-demo`, {
    method: 'POST',
  });
}

// Reviews & Notifications
export async function submitBookingReview(payload: {
  bookingId: number;
  rating: number;
  comment: string;
}): Promise<{ id: number; ok: boolean }> {
  return requestJson('/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function getNotifications(): Promise<{
  notifications: AppNotification[];
  unreadCount: number;
}> {
  return requestJson('/api/notifications');
}

export async function markNotificationRead(id: number): Promise<void> {
  await requestJson(`/api/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await requestJson('/api/notifications/read-all', { method: 'POST' });
}

// Owner Dashboard & Demo Promotion
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const data = await requestJson<{ overview: DashboardOverview }>('/api/dashboard/overview');
  return data.overview;
}

export async function promoteListingDemo(
  listingId: number,
  planName: '7-Day Spotlight (Demo)' | '30-Day Featured Boost (Demo)',
): Promise<{ ok: boolean; listingId: number; isFeatured: boolean; featuredUntil: string }> {
  return requestJson(`/api/items/${listingId}/promote-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planName }),
  });
}

// Admin Moderation
export async function getAdminListings(): Promise<AdminListingItem[]> {
  const data = await requestJson<{ listings: AdminListingItem[] }>('/api/admin/listings');
  return data.listings;
}

export async function updateAdminListingStatus(
  id: number,
  status: 'active' | 'hidden' | 'pending',
): Promise<{ id: number; status: string }> {
  return requestJson(`/api/admin/listings/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const data = await requestJson<{ users: AdminUserSummary[] }>('/api/admin/users');
  return data.users;
}

export async function getAdminReports(): Promise<ListingReportItem[]> {
  const data = await requestJson<{ reports: ListingReportItem[] }>('/api/admin/reports');
  return data.reports;
}

export async function resolveAdminReport(
  reportId: number,
  hideListing = false,
): Promise<void> {
  await requestJson(`/api/admin/reports/${reportId}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hideListing }),
  });
}

