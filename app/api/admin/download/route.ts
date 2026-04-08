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

  const studentId = request.nextUrl.searchParams.get('student_id');
  if (!studentId) {
    return NextResponse.json({ error: 'student_id required' }, { status: 400 });
  }

  const db = createServerClient();

  // Fetch the flyer path from DB
  const { data: exportRow, error } = await db
    .from('flyer_exports')
    .select('flyer_path')
    .eq('student_id', studentId)
    .single();

  if (error || !exportRow?.flyer_path) {
    return NextResponse.json({ error: 'Flyer not found' }, { status: 404 });
  }

  // Get student name for filename
  const { data: student } = await db
    .from('students')
    .select('full_name, matric_no')
    .eq('id', studentId)
    .single();

  // Generate a 60-second signed URL — never stored, generated per request
  const { data: signedData, error: signError } = await db.storage
    .from('flyer-exports')
    .createSignedUrl(exportRow.flyer_path, 60);

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate download URL' }, { status: 500 });
  }

  // Fetch the actual file from Supabase and stream it back
  // This avoids exposing the signed URL to the client
  const fileRes = await fetch(signedData.signedUrl);
  if (!fileRes.ok) {
    return NextResponse.json({ error: 'File download failed' }, { status: 500 });
  }

  const buffer = await fileRes.arrayBuffer();
  const safeMatric = (student?.matric_no || studentId).replace(/\//g, '-');
  const safeName = (student?.full_name || 'student').replace(/[^a-zA-Z0-9 ]/g, '').replace(/ +/g, '_');
  const filename = `${safeMatric}_${safeName}.png`;

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
