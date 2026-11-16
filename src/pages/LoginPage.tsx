import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  {
    email: 'renter@rentora.demo' as const,
    name: 'Sara Malik',
    roleLabel: 'Renter Demo',
    description: 'Browse gear, test AI Rental Finder, or create listings.',
    redirectDefault: '/browse',
  },
  {
    email: 'owner@rentora.demo' as const,
    name: 'Ahmed Khan',
    roleLabel: 'Owner Demo',
    description: 'Manage active gear, incoming bookings, and featured demo plans.',
    redirectDefault: '/dashboard',
  },
  {
    email: 'admin@rentora.demo' as const,
    name: 'Rentora Moderator',
    roleLabel: 'Admin Demo',
    description: 'Review pending listings, sample reports, and demo users.',
    redirectDefault: '/admin',
  },
];

export function LoginPage() {
  const { login, switchDemo } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(nextPath || '/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSwitch = async (
    demoEmail: 'renter@rentora.demo' | 'owner@rentora.demo' | 'admin@rentora.demo',
    fallbackRedirect: string,
  ) => {
    setError(null);
    setSubmitting(true);
    try {
      await switchDemo(demoEmail);
      navigate(nextPath || fallbackRedirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to switch demo account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Email & Password Form */}
        <section className="lg:col-span-6 rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8">
          <p className="text-xs font-semibold text-[#0F766E]">Local Demo Authentication</p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#172554]">
            Sign in to Rentora
          </h1>
          <p className="mt-2 text-sm text-[#64748B]">
            One account lets you both rent gear and list belongings you already own.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-5 rounded-xl bg-[#FEF2F2] p-3.5 text-sm text-[#B91C1C]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@rentora.demo"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-[#475569] mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter demo password"
                className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
              />
              <p className="mt-1.5 text-xs text-[#64748B]">
                Seeded demo password:{' '}
                <code className="font-mono text-[#172554]">rentora-demo-2026</code>
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[#64748B]">New to this local demo?</span>
            <Link
              to="/register"
              className="font-semibold text-[#0F766E] hover:underline inline-flex items-center gap-1"
            >
              <span>Create demo account</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* One-Click Demo Switcher */}
        <aside className="lg:col-span-6 rounded-2xl bg-[#172554] text-white p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5EEAD4]">
            <KeyRound className="w-4 h-4" aria-hidden="true" />
            <span>Quick Demo Account Switcher</span>
          </div>
          <h2 className="mt-2 font-display text-xl sm:text-2xl font-bold text-white">
            Continue immediately as a demo role
          </h2>
          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Use these pre-seeded local accounts to test renter discovery, owner listing creation,
            and role permissions during your walkthrough.
          </p>

          <div className="mt-6 space-y-3">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                type="button"
                disabled={submitting}
                onClick={() => handleDemoSwitch(acct.email, acct.redirectDefault)}
                className="w-full text-left rounded-xl bg-white/10 hover:bg-white/15 p-4 transition-colors cursor-pointer disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-semibold text-white">
                      {acct.name}
                    </p>
                    <p className="text-xs text-[#5EEAD4] mt-0.5">
                      {acct.roleLabel} · {acct.email}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" aria-hidden="true" />
                </div>
                <p className="mt-2 text-xs text-slate-300">{acct.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-white/10 flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-[#5EEAD4] shrink-0" aria-hidden="true" />
            <span>
              Sessions are stored in signed HTTP-only cookies. Email/phone verification is
              simulated for demo purposes.
            </span>
          </div>
        </aside>
      </div>
    </main>
  );
}
