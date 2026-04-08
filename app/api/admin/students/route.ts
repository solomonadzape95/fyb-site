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

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServerClient();

  const { data: students, error } = await db
    .from('students')
    .select(`
      *,
      fyb_answers ( id, updated_at ),
      flyer_exports ( id, flyer_path, generated_at )
    `)
    .is('deleted_at', null)
    .order('full_name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }

  return NextResponse.json({ students });
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServerClient();
  const body = await request.json();

  if (body.action === 'lock_all') {
    await db
      .from('students')
      .update({ is_locked: true })
      .eq('has_submitted', true)
      .is('deleted_at', null);
    return NextResponse.json({ success: true });
  }

  const { student_id, is_locked } = body;
  if (!student_id) {
    return NextResponse.json({ error: 'student_id required' }, { status: 400 });
  }

  await db.from('students').update({ is_locked }).eq('id', student_id);
  return NextResponse.json({ success: true });
}
