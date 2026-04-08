import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@/lib/supabase';

function getSecret() {
  return new TextEncoder().encode(process.env.ADMIN_PASSWORD);
}

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('fyb_admin_token')?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

function escapeCsv(val: string | null | undefined): string {
  if (!val) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServerClient();

  const { data, error } = await db
    .from('students')
    .select(`*, fyb_answers(*)`)
    .is('deleted_at', null)
    .order('full_name');

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }

  const headers = [
    'Matric No.',
    'Full Name',
    'Course',
    'Nickname',
    'DOB',
    'Gender',
    'Relationship Status',
    'Hobbies',
    'Favourite Course',
    'Favourite Lecturer',
    'Most Challenging Level',
    'Best Level',
    'Class Crush',
    'Best Memory',
    'Advice to Freshers',
    'What Next',
    'Favourite Quote',
    'Fun Fact',
    'Shoutouts',
    'Social Handle',
    'Has Submitted',
    'Submitted At',
  ];

  const rows = (data || []).map((s) => {
    const a = s.fyb_answers as Record<string, string | null> | null;
    return [
      s.matric_no,
      s.full_name,
      s.course_of_study,
      s.nickname,
      s.dob,
      s.gender,
      a?.relationship_status,
      a?.hobbies,
      a?.favourite_course,
      a?.favourite_lecturer,
      a?.most_challenging_level,
      a?.best_level,
      a?.class_crush,
      a?.best_memory,
      a?.advice_to_freshers,
      a?.what_next_after_school,
      a?.favourite_quote,
      a?.fun_fact,
      a?.shoutouts,
      a?.social_media_handle,
      s.has_submitted ? 'Yes' : 'No',
      s.submitted_at || '',
    ].map(escapeCsv).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="fyb-submissions-${date}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
