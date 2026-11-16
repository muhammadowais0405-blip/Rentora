import { Link } from 'react-router-dom';
import { RentoraLogo } from '../common/RentoraLogo';

export function Footer() {
  return (
    <footer className="bg-[#172554] text-slate-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <Link to="/" className="inline-block">
              <RentoraLogo variant="dark" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 max-w-sm">
              Rent. Share. Earn. A peer-to-peer rental marketplace prototype for cameras,
              gaming consoles, bikes, and electronics.
            </p>
            <p className="mt-4 text-xs text-slate-400">
              University Entrepreneurship & Web Development Project · Local SQLite Demo
            </p>
          </div>

          <div className="md:col-span-4">
            <h3 className="font-display text-sm font-semibold text-white">Browse categories</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <Link
                  to="/category/cameras-photography"
                  className="hover:text-[#14B8A6] transition-colors"
                >
                  Cameras &amp; Photography
                </Link>
              </li>
              <li>
                <Link
                  to="/category/gaming-consoles"
                  className="hover:text-[#14B8A6] transition-colors"
                >
                  Gaming Consoles
                </Link>
              </li>
              <li>
                <Link
                  to="/category/bikes-cycles"
                  className="hover:text-[#14B8A6] transition-colors"
                >
                  Bikes &amp; Cycles
                </Link>
              </li>
              <li>
                <Link
                  to="/category/electronics-equipment"
                  className="hover:text-[#14B8A6] transition-colors"
                >
                  Electronics &amp; Equipment
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h3 className="font-display text-sm font-semibold text-white">Marketplace tools</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <Link to="/browse" className="hover:text-[#14B8A6] transition-colors">
                  All rentals
                </Link>
              </li>
              <li>
                <Link to="/ai-finder" className="hover:text-[#14B8A6] transition-colors">
                  AI Rental Finder
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-[#14B8A6] transition-colors">
                  Owner dashboard
                </Link>
              </li>
              <li>
                <Link to="/bookings" className="hover:text-[#14B8A6] transition-colors">
                  My bookings
                </Link>
              </li>
              <li>
                <Link to="/saved" className="hover:text-[#14B8A6] transition-colors">
                  Saved rentals
                </Link>
              </li>
              <li>
                <Link to="/list-item" className="hover:text-[#14B8A6] transition-colors">
                  List an item
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>Rentora Marketplace Prototype</p>
          <p>All prices displayed in PKR · Demo data stored locally in SQLite</p>
        </div>
      </div>
    </footer>
  );
}
