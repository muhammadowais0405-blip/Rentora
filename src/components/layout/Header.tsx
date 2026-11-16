import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RentoraLogo } from '../common/RentoraLogo';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, unreadNotifications } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleHowItWorks = () => {
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/#how-it-works');
      setTimeout(() => {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } else {
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const firstName = user
    ? user.role === 'admin' && user.name.startsWith('Rentora')
      ? 'Admin'
      : user.name.split(' ')[0]
    : '';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        <Link
          to="/"
          className="whitespace-nowrap shrink-0 rounded-lg focus-visible:outline-none"
          onClick={() => setMobileMenuOpen(false)}
        >
          <RentoraLogo variant="light" />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#475569]"
        >
          <Link
            to="/browse"
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 ${
              location.pathname === '/browse' ? 'text-[#0F766E] font-semibold' : ''
            }`}
          >
            Browse
          </Link>
          <Link
            to="/ai-finder"
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 ${
              location.pathname === '/ai-finder' ? 'text-[#0F766E] font-semibold' : ''
            }`}
          >
            AI Finder
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 ${
                  location.pathname === '/dashboard' ? 'text-[#0F766E] font-semibold' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/bookings"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 ${
                  location.pathname.startsWith('/bookings') ? 'text-[#0F766E] font-semibold' : ''
                }`}
              >
                Bookings{unreadNotifications > 0 ? ` (${unreadNotifications})` : ''}
              </Link>
              <Link
                to="/profile"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 ${
                  location.pathname === '/profile' ||
                  location.pathname === '/saved' ||
                  location.pathname === '/admin'
                    ? 'text-[#0F766E] font-semibold'
                    : ''
                }`}
              >
                {firstName}
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleHowItWorks}
                className="whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 cursor-pointer"
              >
                How it works
              </button>
              <Link
                to="/login"
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#172554] hover:underline underline-offset-4 ${
                  location.pathname === '/login' || location.pathname === '/register'
                    ? 'text-[#0F766E] font-semibold'
                    : ''
                }`}
              >
                Sign in
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/list-item"
            className="hidden md:inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            List an item
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center p-2.5 rounded-xl text-[#172554] hover:bg-[#F1F5F9] transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-1.5">
          <Link
            to="/browse"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            Browse rentals
          </Link>
          <Link
            to="/ai-finder"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
          >
            AI Rental Finder
          </Link>
          {user ? (
            <>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                Owner dashboard
              </Link>
              <Link
                to="/bookings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                Bookings{unreadNotifications > 0 ? ` (${unreadNotifications} unread)` : ''}
              </Link>
              <Link
                to="/saved"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                Saved rentals
              </Link>
              <Link
                to="/my-listings"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                My listings
              </Link>
              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F766E] hover:bg-[#F0FDFA]"
                >
                  Moderator queue
                </Link>
              )}
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                Profile ({firstName})
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-xl text-sm font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
            >
              Sign in
            </Link>
          )}
          <div className="pt-2">
            <Link
              to="/list-item"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center w-full px-4 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] text-white text-sm font-semibold transition-colors"
            >
              List an item
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
