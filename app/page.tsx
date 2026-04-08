'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/student';

type Step = 'entry' | 'confirm';

export default function LandingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('entry');
  const [matricInput, setMatricInput] = useState('');
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const matric = matricInput.trim().toUpperCase();
    if (!matric) {
      setError('Please enter your matric number.');
      setLoading(false);
      return;
    }

    const { data, error: dbError } = await supabase
      .from('students')
      .select('*')
      .eq('matric_no', matric)
      .is('deleted_at', null)
      .single();

    setLoading(false);

    if (dbError || !data) {
      setError('Matric number not recognised. Contact the FYB committee.');
      return;
    }

    setStudent(data as Student);
    setStep('confirm');
  }

  function handleConfirm() {
    if (!student) return;
    const session = { student_id: student.id, matric_no: student.matric_no };
    localStorage.setItem('fyb_session', JSON.stringify(session));
    document.cookie = `fyb_session_mirror=1; path=/; max-age=31536000; SameSite=Lax`;
    if (student.has_submitted) {
      router.push('/submit?submitted=true');
    } else {
      router.push('/submit');
    }
  }

  function handleDeny() {
    setStep('entry');
    setMatricInput('');
    setStudent(null);
    setError('Please check your matric number or contact the committee.');
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#0e0e0e' }}
    >
      {/* Background photo */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      {/* Darkening overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(10,10,10,0.78)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">

        {/* Brand header */}
        <div className="text-center mb-7">
          {/* Logos side by side */}
          <div className="flex items-center justify-center gap-5 mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/unn.png"
              alt="University of Nigeria"
              style={{ width: 82, height: 82, objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.85))' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/nacos.png"
              alt="NACOS"
              style={{ width: 82, height: 82, objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.85))' }}
            />
          </div>

          {/* Heading — "NACOS '26" in gold, subtitle in white */}
          <div>
            <div
              className="font-black leading-none"
              style={{ fontSize: '3rem', color: '#f0b429', letterSpacing: '-0.02em' }}
            >
              NACOS &apos;26
            </div>
            <div
              className="font-black leading-tight mt-1"
              style={{ fontSize: '2rem', color: '#f5f5f5', letterSpacing: '-0.01em' }}
            >
              Final Year Brethren
            </div>
          </div>

          <p
            className="mt-3 text-xs font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'rgba(255,255,255,0.38)' }}
          >
            Dept. of Computer Science &bull; Univ. of Nigeria
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{
            background: 'rgba(14,14,14,0.88)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {step === 'entry' && (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#f5f5f5' }}>
                Welcome
              </h2>
              <p className="text-sm mb-6" style={{ color: '#9ca3af' }}>
                Enter your matric number to fill in your details for the flyer.
              </p>

              <form onSubmit={handleLookup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#9ca3af' }}>
                    Matric Number
                  </label>
                  <input
                    type="text"
                    value={matricInput}
                    onChange={(e) => setMatricInput(e.target.value)}
                    placeholder="e.g. 2022/240000"
                    className="w-full px-4 py-3 rounded-xl text-base font-medium focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1.5px solid rgba(255,255,255,0.1)',
                      color: '#f5f5f5',
                    }}
                    autoFocus
                    autoComplete="off"
                    onFocus={(e) => (e.target.style.borderColor = 'rgba(34,197,94,0.6)')}
                    onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                {error && (
                  <div
                    className="rounded-xl px-4 py-3 text-sm font-medium"
                    style={{
                      background: 'rgba(239,68,68,0.1)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#fca5a5',
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-bold text-base transition-all disabled:opacity-50"
                  style={{
                    background: loading ? 'rgba(240,180,41,0.4)' : '#f0b429',
                    color: '#0e0e0e',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner dark /> Looking up...
                    </span>
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>

              <div className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Having trouble?{' '}
                <a
                  href="https://wa.me/2349129119084"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                  style={{ color: '#f0b429' }}
                >
                  Contact us.
                </a>
                .
              </div>
            </>
          )}

          {step === 'confirm' && student && (
            <>
              <div className="mb-5">
                <h2 className="text-xl font-bold mb-1" style={{ color: '#f5f5f5' }}>Is this you?</h2>
                <p className="text-sm" style={{ color: '#9ca3af' }}>Please confirm your details before continuing.</p>
              </div>

              <div
                className="rounded-xl p-5 mb-6 space-y-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <ConfirmField label="Full Name"     value={student.full_name}       large />
                <ConfirmField label="Course"        value={student.course_of_study} />
                <ConfirmField label="Matric Number" value={student.matric_no}       mono />
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleConfirm}
                  className="w-full py-3 rounded-xl font-bold text-base"
                  style={{ background: '#f0b429', color: '#0e0e0e' }}
                >
                  Yes, that&apos;s me
                </button>
                <button
                  onClick={handleDeny}
                  className="w-full py-3 rounded-xl font-semibold text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#9ca3af' }}
                >
                  Not me — go back
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)' }}>
          FYB &apos;26 &bull; Dept. of Computer Science
        </p>
      </div>
    </main>
  );
}

function ConfirmField({ label, value, large, mono }: { label: string; value: string; large?: boolean; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#9ca3af' }}>{label}</p>
      <p
        className={`font-semibold ${large ? 'text-lg' : 'text-base'}`}
        style={{ color: '#f5f5f5', fontFamily: mono ? 'monospace' : undefined }}
      >
        {value}
      </p>
    </div>
  );
}

function Spinner({ dark }: { dark?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: `2px solid ${dark ? 'rgba(14,14,14,0.3)' : 'rgba(245,245,245,0.25)'}`,
        borderTopColor: dark ? '#0e0e0e' : '#f5f5f5',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}
