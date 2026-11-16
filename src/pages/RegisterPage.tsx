import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ name, email, password, phone });
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="rounded-2xl bg-white border border-[#E2E8F0] p-6 sm:p-8">
        <p className="text-xs font-semibold text-[#0F766E]">Local Demo Registration</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#172554]">
          Create a Rentora account
        </h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Saved in your local SQLite database so you can test listing creation and profile
          preferences.
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
              htmlFor="register-name"
              className="block text-xs font-semibold text-[#475569] mb-1.5"
            >
              Full name
            </label>
            <input
              id="register-name"
              type="text"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Bilal Siddiqui"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-xs font-semibold text-[#475569] mb-1.5"
            >
              Email address
            </label>
            <input
              id="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bilal@university.edu"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
            />
          </div>

          <div>
            <label
              htmlFor="register-phone"
              className="block text-xs font-semibold text-[#475569] mb-1.5"
            >
              Phone number (optional)
            </label>
            <input
              id="register-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+92 300 0000000"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-xs font-semibold text-[#475569] mb-1.5"
            >
              Password (minimum 6 characters)
            </label>
            <input
              id="register-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a demo password"
              className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-[#0F766E] hover:bg-[#0D5F59] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            {submitting ? 'Creating account...' : 'Create demo account'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#E2E8F0] flex items-center justify-between text-sm">
          <span className="text-[#64748B]">Already have a demo account?</span>
          <Link to="/login" className="font-semibold text-[#0F766E] hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
