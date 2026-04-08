'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/student';
import FlyerTemplate from '@/components/FlyerTemplate';

const BG   = '#0e0e0e';
const GOLD = '#f0b429';

export default function DonePage() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('fyb_session');
    if (!raw) { router.replace('/'); return; }
    const session = JSON.parse(raw) as { student_id: string };
    supabase.from('students').select('*').eq('id', session.student_id).single()
      .then(({ data }) => { if (data) setStudent(data as Student); });
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: BG }}>
      <div className="w-full max-w-lg text-center">

        {/* Badge */}
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mx-auto mb-6 text-sm font-black shadow-xl"
          style={{ background: GOLD, color: '#0e0e0e' }}
        >
          FYB
        </div>

        <h1 className="text-4xl font-black mb-3 tracking-tight" style={{ color: '#f5f5f5' }}>
          Flyer submitted!
        </h1>

        {student && (
          <p className="text-base mb-2 font-medium" style={{ color: '#9ca3af' }}>
            {student.full_name} &bull; {student.course_of_study}
          </p>
        )}

        <p className="text-sm mb-8 leading-relaxed" style={{ color: '#9ca3af' }}>
          The committee will post your flyer. Keep an eye on the class group!
        </p>

        {/* Blurred flyer thumbnail */}
        {student && (
          <div className="flex justify-center mb-8">
            <div
              style={{
                width: 189,
                height: 237,
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
              }}
            >
              <div style={{ transform: 'scale(0.175)', transformOrigin: 'top left', width: 1080, height: 1350 }}>
                <FlyerTemplate student={student} answers={{}} showWatermark={false} photoUrl={student.photo_url || null} />
              </div>
              <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(14,14,14,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="text-center">
                  <div className="w-7 h-7 rounded-lg mx-auto mb-1 flex items-center justify-center text-xs font-black" style={{ background: GOLD, color: '#0e0e0e' }}>FYB</div>
                  <p className="text-xs font-bold" style={{ color: '#f5f5f5' }}>Committee only</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className="rounded-2xl p-5 mb-6 text-left"
          style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>
            <strong style={{ color: '#f5f5f5' }}>What happens next?</strong>
            <br />
            Your flyer has been generated and stored securely. The FYB committee will post it on
            the official class channels. You don&apos;t need to do anything else!
          </p>
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)' }}>
          FYB &apos;26 &bull; Class of 2026 &bull; Dept. of Computer Science
        </p>
      </div>
    </main>
  );
}
