'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StudentWithAnswers } from '@/types/student';

type FilterTab = 'all' | 'not_started' | 'form_complete' | 'flyer_generated';
type SortKey   = 'name' | 'submitted_at';

const BG      = '#0e0e0e';
const SURFACE = '#181818';
const BORDER  = 'rgba(255,255,255,0.08)';
const GOLD    = '#f0b429';
const GREEN   = '#22c55e';
const TEXT    = '#f5f5f5';
const MUTED   = '#9ca3af';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentWithAnswers[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [togglingLock, setTogglingLock] = useState<string | null>(null);

  // Dispatch state
  const [dispatchCount, setDispatchCount] = useState(3);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<{ sent: number; names: string[]; failed?: string[] } | null>(null);
  const [remainingCount, setRemainingCount] = useState<number | null>(null);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/students');
    if (res.status === 401) { router.push('/admin/login'); return; }
    const data = await res.json();
    setStudents(data.students || []);
    setLoading(false);
  }, [router]);

  async function fetchRemaining() {
    const res = await fetch('/api/admin/dispatch');
    if (res.ok) {
      const data = await res.json();
      setRemainingCount(data.remaining ?? null);
    }
  }

  useEffect(() => {
    fetchStudents();
    fetchRemaining();
  }, [fetchStudents]);

  async function handleDispatch() {
    setDispatching(true);
    setDispatchResult(null);
    const res = await fetch('/api/admin/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: dispatchCount }),
    });
    const data = await res.json();
    if (res.ok) {
      setDispatchResult(data);
      await fetchRemaining();
    } else {
      setDispatchResult({ sent: 0, names: [], failed: [data.error || 'Unknown error'] });
    }
    setDispatching(false);
  }

  async function toggleLock(id: string, cur: boolean) {
    setTogglingLock(id);
    await fetch('/api/admin/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: id, is_locked: !cur }) });
    setStudents((s) => s.map((st) => st.id === id ? { ...st, is_locked: !cur } : st));
    setTogglingLock(null);
  }

  async function lockAll() {
    if (!confirm('Lock all submitted students?')) return;
    await fetch('/api/admin/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lock_all' }) });
    fetchStudents();
  }

  async function logout() {
    await fetch('/api/admin-auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  let filtered = students.filter((s) => {
    if (s.deleted_at) return false;
    const q = search.toLowerCase();
    if (q && !s.full_name.toLowerCase().includes(q) && !s.matric_no.toLowerCase().includes(q)) return false;
    if (filter === 'not_started')    return !s.fyb_answers;
    if (filter === 'form_complete')  return !!s.fyb_answers && !s.has_submitted;
    if (filter === 'flyer_generated') return s.has_submitted;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    const cmp = sort === 'name'
      ? a.full_name.localeCompare(b.full_name)
      : (a.submitted_at || '').localeCompare(b.submitted_at || '');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const total          = students.filter((s) => !s.deleted_at).length;
  const totalSubmitted = students.filter((s) => s.has_submitted && !s.deleted_at).length;
  const totalFlyers    = students.filter((s) => s.flyer_exports && !s.deleted_at).length;

  function toggleSort(key: SortKey) {
    if (sort === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSort(key); setSortDir('asc'); }
  }

  const TABS: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'not_started', label: 'Not Started' },
    { key: 'form_complete', label: 'Form Complete' },
    { key: 'flyer_generated', label: 'Flyer Generated' },
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Nav */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(14,14,14,0.95)', borderBottom: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-lg text-xs font-black tracking-widest" style={{ background: GOLD, color: '#0e0e0e' }}>FYB</div>
            <span className="font-bold" style={{ color: TEXT }}>Admin Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/import" className="text-sm font-semibold" style={{ color: MUTED }}>Import CSV</Link>
            <a href="/api/admin/bulk-export" className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: GOLD, color: '#0e0e0e' }}>Bulk Export</a>
            <button onClick={lockAll} className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: MUTED }}>Lock All</button>
            <a href="/api/admin/csv-export" className="text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${BORDER}`, color: MUTED }}>CSV Export</a>
            <button onClick={logout} className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.2)' }}>Log out</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Total Students"   value={total} />
          <StatCard label="Submitted"        value={`${totalSubmitted} / ${total}`} />
          <StatCard label="Flyers Generated" value={totalFlyers} />
        </div>

        {/* Dispatch card */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-bold text-sm mb-0.5" style={{ color: TEXT }}>Dispatch Today&apos;s Flyers</p>
              <p className="text-xs" style={{ color: MUTED }}>
                {remainingCount !== null
                  ? `${remainingCount} undispatched flyer${remainingCount !== 1 ? 's' : ''} remaining`
                  : 'Sends randomly selected flyers to Telegram'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold" style={{ color: MUTED }}>Count</label>
                <input
                  type="number" min={1} max={10} value={dispatchCount}
                  onChange={(e) => setDispatchCount(Math.min(10, Math.max(1, Number(e.target.value))))}
                  className="w-16 px-2 py-1.5 rounded-lg text-sm text-center focus:outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, color: TEXT }}
                />
              </div>
              <button
                onClick={handleDispatch}
                disabled={dispatching}
                className="px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: GOLD, color: '#0e0e0e' }}
              >
                {dispatching ? 'Sending...' : 'Send to Telegram'}
              </button>
            </div>
          </div>

          {dispatchResult && (
            <div
              className="mt-4 p-3 rounded-xl text-sm"
              style={{
                background: dispatchResult.sent > 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${dispatchResult.sent > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                color: dispatchResult.sent > 0 ? '#4ade80' : '#f87171',
              }}
            >
              {dispatchResult.sent > 0 ? (
                <>Sent {dispatchResult.sent} flyer{dispatchResult.sent !== 1 ? 's' : ''}: <span style={{ color: TEXT }}>{dispatchResult.names.join(', ')}</span></>
              ) : (
                dispatchResult.failed?.[0] || 'Nothing was sent.'
              )}
              {dispatchResult.failed && dispatchResult.failed.length > 0 && dispatchResult.sent > 0 && (
                <span className="ml-2" style={{ color: '#f87171' }}>Failed: {dispatchResult.failed.join(', ')}</span>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          {/* Filters bar */}
          <div className="p-4 flex items-center gap-4 flex-wrap" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or matric..."
              className="flex-1 min-w-48 px-4 py-2 rounded-xl text-sm focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, color: TEXT }}
            />
            <div className="flex gap-2">
              {TABS.map((tab) => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={filter === tab.key ? { background: GOLD, color: '#0e0e0e' } : { background: 'rgba(255,255,255,0.05)', color: MUTED }}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm" style={{ color: MUTED }}>Loading students...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: MUTED }}>No students found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <tr>
                    <Th>Photo</Th>
                    <SortTh label="Full Name"  sk="name"         cur={sort} dir={sortDir} onSort={toggleSort} />
                    <Th>Matric No.</Th>
                    <Th>Form</Th>
                    <Th>Flyer</Th>
                    <SortTh label="Submitted" sk="submitted_at" cur={sort} dir={sortDir} onSort={toggleSort} />
                    <Th>Locked</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td className="px-4 py-3">
                        {s.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" style={{ border: `1px solid ${BORDER}` }} />
                        ) : (
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs" style={{ background: 'rgba(255,255,255,0.07)', color: MUTED }}>?</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold" style={{ color: TEXT }}>{s.full_name}</td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: MUTED }}>{s.matric_no}</td>
                      <td className="px-4 py-3"><Badge yes={!!s.fyb_answers} /></td>
                      <td className="px-4 py-3"><Badge yes={s.has_submitted} /></td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {s.submitted_at ? new Date(s.submitted_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleLock(s.id, s.is_locked)} disabled={togglingLock === s.id}
                          className="text-xs font-semibold px-2 py-1 rounded-lg"
                          style={s.is_locked
                            ? { background: 'rgba(240,180,41,0.12)', border: '1px solid rgba(240,180,41,0.25)', color: GOLD }
                            : { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: MUTED }}>
                          {s.is_locked ? 'Locked' : 'Open'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-3">
                          <Link href={`/admin/${s.id}`} className="text-xs font-semibold" style={{ color: GREEN }}>View</Link>
                          {s.has_submitted && (
                            <a href={`/api/admin/download?student_id=${s.id}`} className="text-xs font-semibold" style={{ color: MUTED }}>Download</a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="p-4 text-xs" style={{ borderTop: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.2)' }}>
            Showing {filtered.length} of {total} students
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-2xl font-black" style={{ color: TEXT }}>{value}</div>
      <div className="text-sm mt-0.5 font-medium" style={{ color: MUTED }}>{label}</div>
    </div>
  );
}

function Badge({ yes }: { yes: boolean }) {
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={yes
        ? { background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }
        : { background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: 'rgba(255,255,255,0.25)' }}>
      {yes ? 'Yes' : 'No'}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{children}</th>;
}

function SortTh({ label, sk, cur, dir, onSort }: { label: string; sk: SortKey; cur: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void }) {
  const active = cur === sk;
  return (
    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
      style={{ color: active ? GOLD : 'rgba(255,255,255,0.3)' }}
      onClick={() => onSort(sk)}>
      {label} {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </th>
  );
}
