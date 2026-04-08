'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BG      = '#0e0e0e';
const SURFACE = '#181818';
const BORDER  = 'rgba(255,255,255,0.08)';
const GOLD    = '#f0b429';
const TEXT    = '#f5f5f5';
const MUTED   = '#9ca3af';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/admin/dashboard');
    } else {
      setError('Incorrect password. Please try again.');
      setPassword('');
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black mx-auto mb-4 shadow-lg" style={{ background: GOLD, color: '#0e0e0e' }}>
            FYB
          </div>
          <h1 className="text-2xl font-black" style={{ color: TEXT }}>Admin Login</h1>
          <p className="text-sm mt-1" style={{ color: MUTED }}>FYB &apos;26 Committee Dashboard</p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: MUTED }}>Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl font-medium focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.04)', border: `1.5px solid ${BORDER}`, color: TEXT }}
                autoFocus
                onFocus={(e) => (e.target.style.borderColor = 'rgba(34,197,94,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = BORDER)}
              />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-3 rounded-xl font-bold text-base transition-all disabled:opacity-50"
              style={{ background: loading ? 'rgba(240,180,41,0.4)' : GOLD, color: '#0e0e0e' }}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
