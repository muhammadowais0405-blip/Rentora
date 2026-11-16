import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle2,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
  const { user, loading, logout, saveProfile, favoriteIds, unreadNotifications } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-64 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login?next=/profile" replace />;
  }

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    setError(null);
    try {
      await saveProfile(name, phone);
      setFeedback('Profile details saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Account Overview & Shortcuts */}
        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-2xl bg-[#172554] text-white p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#14B8A6] text-[#0F172A] font-display text-lg font-bold flex items-center justify-center shrink-0">
                {user.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-xl font-bold text-white truncate">
                  {user.name}
                </h1>
                <p className="text-sm text-slate-300 truncate">{user.email}</p>
                <p className="mt-1 text-xs text-[#5EEAD4]">
                  {user.role === 'admin' ? 'Admin Moderator (demo)' : 'Renter & Owner account'}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-white/10 space-y-2 text-xs text-slate-200">
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" aria-hidden="true" />
                <span>
                  {user.emailVerifiedDemo
                    ? 'Email verified (demo)'
                    : 'Email not verified (demo)'}
                </span>
              </p>
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5EEAD4]" aria-hidden="true" />
                <span>
                  {user.phoneVerifiedDemo
                    ? 'Phone verified (demo)'
                    : 'Phone verification optional (demo)'}
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#E2E8F0] p-5 space-y-1.5">
            <h2 className="font-display text-sm font-bold text-[#172554] px-2 pb-1">
              Workspace shortcuts
            </h2>
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>Owner dashboard</span>
            </Link>
            <Link
              to="/bookings"
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <span className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                <span>Bookings &amp; notifications</span>
              </span>
              {unreadNotifications > 0 && (
                <span className="text-xs font-semibold text-[#0F766E] tabular-nums">
                  {unreadNotifications} unread
                </span>
              )}
            </Link>
            <Link
              to="/saved"
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <span className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
                <span>Saved rentals</span>
              </span>
              <span className="text-xs font-medium text-[#64748B] tabular-nums">
                {favoriteIds.size}
              </span>
            </Link>
            <Link
              to="/my-listings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <Package className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>My listings</span>
            </Link>
            <Link
              to="/list-item"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <PlusCircle className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>List a new item</span>
            </Link>
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#0F766E] bg-[#F0FDFA] hover:bg-[#CCFBF1] transition-colors"
              >
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                <span>Moderator queue</span>
              </Link>
            )}
            <Link
              to="/ai-finder"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <Sparkles className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>AI Rental Finder</span>
            </Link>
            <Link
              to="/browse"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
            >
              <Search className="w-4 h-4 text-[#0F766E]" aria-hidden="true" />
              <span>Browse rentals</span>
            </Link>
            <div className="pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Editable Profile Form */}
        <section className="lg:col-span-7 rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172554]">
            Account settings
          </h2>
          <p className="mt-1 text-sm text-[#64748B]">
            Update your public owner/renter display name and contact phone number for this demo.
          </p>

          {feedback && (
            <div
              role="status"
              className="mt-5 rounded-xl bg-[#F0FDF4] p-3.5 text-sm text-[#15803D] flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{feedback}</span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm text-[#B91C1C]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="profile-name"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Display name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Email address
              </label>
              <input
                id="profile-email"
                type="email"
                disabled
                value={user.email}
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F1F5F9] text-sm text-[#64748B]"
              />
            </div>

            <div>
              <label
                htmlFor="profile-phone"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Demo phone number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+92 300 0000000"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <Link
                to="/login"
                className="px-4 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-semibold text-[#172554] hover:bg-[#F1F5F9] transition-colors"
              >
                Switch demo account
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
