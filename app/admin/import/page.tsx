'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';

interface ParsedRow {
  matric_no: string;
  full_name: string;
  course_of_study: string;
}
interface ImportResult { imported: number; skipped: number; errors: string[]; }

const BG      = '#0e0e0e';
const SURFACE = '#181818';
const BORDER  = 'rgba(255,255,255,0.08)';
const GOLD    = '#f0b429';
const GREEN   = '#22c55e';
const TEXT    = '#f5f5f5';
const MUTED   = '#9ca3af';

export default function AdminImportPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(''); setResult(null); setRows([]);
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const missing = ['matric_no', 'full_name', 'course_of_study'].filter((r) => !res.meta.fields?.includes(r));
        if (missing.length) { setParseError(`Missing columns: ${missing.join(', ')}`); return; }
        setRows(res.data.map((row) => ({
          matric_no: (row.matric_no || '').trim().toUpperCase(),
          full_name: (row.full_name || '').trim(),
          course_of_study: (row.course_of_study || '').trim(),
        })).filter((r) => r.matric_no && r.full_name));
      },
      error: (err) => setParseError(err.message),
    });
  }, []);

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true);
    const res = await fetch('/api/admin/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ students: rows }) });
    const data = await res.json();
    setResult(data as ImportResult);
    setImporting(false);
    if (data.imported > 0) setRows([]);
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="sticky top-0 z-30" style={{ background: 'rgba(14,14,14,0.95)', borderBottom: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' }}>
        <div className="max-w-screen-md mx-auto px-6 h-14 flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-sm font-medium" style={{ color: MUTED }}>Back</Link>
          <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
          <span className="font-bold text-sm" style={{ color: TEXT }}>Import Students</span>
        </div>
      </div>

      <div className="max-w-screen-md mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ color: TEXT }}>Import Students</h1>
          <p className="text-sm" style={{ color: MUTED }}>
            CSV columns required:{' '}
            {['matric_no', 'full_name', 'course_of_study'].map((c) => (
              <code key={c} className="font-mono text-xs px-1.5 py-0.5 rounded mx-0.5"
                style={{ background: 'rgba(255,255,255,0.07)', color: GREEN }}>{c}</code>
            ))}
          </p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <label className="block cursor-pointer">
            <div className="rounded-xl p-8 text-center" style={{ border: `2px dashed ${BORDER}`, background: 'rgba(255,255,255,0.02)' }}>
              <p className="font-semibold" style={{ color: MUTED }}>Click to select a CSV file</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.18)' }}>CSV files only</p>
            </div>
            <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
          </label>
        </div>

        {parseError && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}>
            {parseError}
          </div>
        )}

        {rows.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <span className="font-bold text-sm" style={{ color: TEXT }}>{rows.length} rows ready</span>
              <button onClick={handleImport} disabled={importing} className="px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ background: GOLD, color: '#0e0e0e' }}>
                {importing ? 'Importing...' : 'Import Now'}
              </button>
            </div>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead style={{ position: 'sticky', top: 0, background: SURFACE }}>
                  <tr>
                    {['Matric No.', 'Full Name', 'Course'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                      <td className="px-4 py-2 font-mono text-xs" style={{ color: GREEN }}>{row.matric_no}</td>
                      <td className="px-4 py-2 font-medium" style={{ color: TEXT }}>{row.full_name}</td>
                      <td className="px-4 py-2 text-xs" style={{ color: MUTED }}>{row.course_of_study}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-2xl px-5 py-4 space-y-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <p className="font-bold" style={{ color: GREEN }}>Import Complete</p>
            <p className="text-sm" style={{ color: MUTED }}>{result.imported} imported, {result.skipped} skipped (duplicates).</p>
            {result.errors.length > 0 && (
              <ul className="text-xs mt-2 space-y-1" style={{ color: '#fca5a5' }}>
                {result.errors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
