'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Student, FybAnswers } from '@/types/student';
import FlyerTemplate from '@/components/FlyerTemplate';

interface Props {
  student: Student;
  answers: Partial<FybAnswers>;
  hasFlyer: boolean;
}

const BG      = '#0e0e0e';
const SURFACE = '#181818';
const BORDER  = 'rgba(255,255,255,0.08)';
const GOLD    = '#f0b429';
const GREEN   = '#22c55e';
const TEXT    = '#f5f5f5';
const MUTED   = '#9ca3af';

export default function AdminStudentClient({ student, answers, hasFlyer }: Props) {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(student.is_locked);
  const [togglingLock, setTogglingLock] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');

  async function toggleLock() {
    setTogglingLock(true);
    await fetch('/api/admin/students', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: student.id, is_locked: !isLocked }) });
    setIsLocked((l) => !l);
    setMessage(`Record ${!isLocked ? 'locked' : 'unlocked'}.`);
    setTogglingLock(false);
    setTimeout(() => setMessage(''), 3000);
  }

  async function regenerateFlyer() {
    if (!confirm('Re-generate the flyer for this student?')) return;
    setRegenerating(true);
    setMessage('Generating...');
    const res = await fetch('/api/generate-flyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: student.id }) });
    setRegenerating(false);
    if (res.ok) { setMessage('Flyer re-generated.'); router.refresh(); }
    else { const b = await res.json().catch(() => ({})); setMessage(`Error: ${b.error || 'Failed.'}`); }
    setTimeout(() => setMessage(''), 5000);
  }

  async function deleteStudent() {
    setDeleting(true);
    await fetch(`/api/admin/students/${student.id}`, { method: 'DELETE' });
    router.push('/admin/dashboard');
  }

  const ANSWER_LABELS: [keyof FybAnswers, string][] = [
    ['relationship_status',    'Relationship Status'],
    ['hobbies',                'Hobbies'],
    ['favourite_course',       'Favourite Course'],
    ['favourite_lecturer',     'Favourite Lecturer'],
    ['most_challenging_level', 'Most Challenging Level'],
    ['most_challenging_course','Most Challenging Course'],
    ['best_level',             'Best Level'],
    ['best_memory',            'Best Campus Memory'],
    ['advice_to_freshers',     'Advice to 100L Students'],
    ['what_next_after_school', 'What Next After School?'],
    ['favourite_quote',        'Favourite Quote'],
    ['fun_fact',               'Fun Fact'],
    ['shoutouts',              'Shoutouts'],
    ['social_media_handle',    'Social Media Handle'],
  ];

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Nav */}
      <div className="sticky top-0 z-30" style={{ background: 'rgba(14,14,14,0.95)', borderBottom: `1px solid ${BORDER}`, backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-sm font-medium" style={{ color: MUTED }}>Back</Link>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span className="font-bold text-sm" style={{ color: TEXT }}>{student.full_name}</span>
          </div>
          {message && (
            <div className="text-sm font-medium px-3 py-1 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: GREEN }}>
              {message}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Preview + actions */}
          <div className="space-y-4">
            <h2 className="font-bold" style={{ color: TEXT }}>Flyer Preview</h2>
            <div style={{ width: 410, height: 513, overflow: 'hidden', borderRadius: 10, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', border: `1px solid ${BORDER}` }}>
              <div style={{ transform: 'scale(0.38)', transformOrigin: 'top left', width: 1080, height: 1350 }}>
                <FlyerTemplate student={student} answers={answers} showWatermark={false} photoUrl={student.photo_url || null} />
              </div>
            </div>

            <div className="rounded-2xl p-5 space-y-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <h3 className="font-bold text-sm" style={{ color: TEXT }}>Actions</h3>
              {hasFlyer && (
                <a href={`/api/admin/download?student_id=${student.id}`}
                  className="flex items-center justify-center w-full py-2.5 px-4 rounded-xl font-bold text-sm"
                  style={{ background: GOLD, color: '#0e0e0e' }}>
                  Download Flyer PNG
                </a>
              )}
              <button onClick={regenerateFlyer} disabled={regenerating} className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: MUTED }}>
                {regenerating ? 'Generating...' : 'Re-generate Flyer'}
              </button>
              <button onClick={toggleLock} disabled={togglingLock} className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: MUTED }}>
                {isLocked ? 'Unlock Record' : 'Lock Record'}
              </button>
              <button onClick={() => setShowDeleteModal(true)} className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', color: '#fca5a5' }}>
                Delete Record
              </button>
            </div>

            <div className="rounded-2xl p-5 space-y-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <h3 className="font-bold text-sm mb-3" style={{ color: TEXT }}>Status</h3>
              <InfoRow label="Submitted"        value={student.has_submitted ? 'Yes' : 'No'} />
              <InfoRow label="Flyer Generated"  value={hasFlyer ? 'Yes' : 'No'} />
              <InfoRow label="Record Locked"    value={isLocked ? 'Yes' : 'No'} />
              {student.submitted_at && <InfoRow label="Submitted At" value={new Date(student.submitted_at).toLocaleString('en-GB')} />}
            </div>
          </div>

          {/* Answers */}
          <div className="space-y-4">
            <h2 className="font-bold" style={{ color: TEXT }}>Student Information</h2>
            <div className="rounded-2xl p-5 space-y-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <h3 className="font-semibold text-xs uppercase tracking-wide mb-3" style={{ color: MUTED }}>Personal Details</h3>
              <InfoRow label="Full Name"   value={student.full_name} />
              <InfoRow label="Matric No."  value={student.matric_no} />
              <InfoRow label="Course"      value={student.course_of_study} />
              <InfoRow label="Nickname"    value={student.nickname || '—'} />
              <InfoRow label="DOB"         value={student.dob || '—'} />
              <InfoRow label="Gender"      value={student.gender || '—'} />
            </div>
            <div className="rounded-2xl p-5 space-y-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <h3 className="font-semibold text-xs uppercase tracking-wide mb-3" style={{ color: MUTED }}>FYB Answers</h3>
              {ANSWER_LABELS.map(([key, label]) => (
                <InfoRow key={key} label={label} value={(answers[key] as string) || '—'} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }}>
          <div className="rounded-2xl shadow-2xl p-6 max-w-sm w-full" style={{ background: '#202020', border: `1px solid ${BORDER}` }}>
            <h3 className="font-black text-lg mb-2" style={{ color: TEXT }}>Delete Record?</h3>
            <p className="text-sm mb-6" style={{ color: MUTED }}>
              This will soft-delete <strong style={{ color: TEXT }}>{student.full_name}</strong> and remove them from the dashboard.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl font-semibold text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, color: MUTED }}>
                Cancel
              </button>
              <button onClick={deleteStudent} disabled={deleting} className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.8)', color: TEXT }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="font-medium min-w-36 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      <span style={{ color: TEXT }}>{value}</span>
    </div>
  );
}
