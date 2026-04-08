import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@/lib/supabase';

export const maxDuration = 60;

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
  const { count } = await db
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('has_submitted', true)
    .is('dispatched_at', null)
    .is('deleted_at', null);

  return NextResponse.json({ remaining: count ?? 0 });
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in environment variables.' },
      { status: 500 }
    );
  }

  let body: { count?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const count = Math.min(Math.max(1, body.count ?? 3), 10);

  const db = createServerClient();

  // Pick N random submitted, undispatched students
  const { data: students, error: pickError } = await db
    .from('students')
    .select('id, full_name, matric_no')
    .eq('has_submitted', true)
    .is('dispatched_at', null)
    .is('deleted_at', null)
    .order('submitted_at')  // stable base order; we'll shuffle in JS
    .limit(count * 5);      // over-fetch so we can shuffle

  if (pickError || !students || students.length === 0) {
    return NextResponse.json({ error: 'No undispatched flyers available.' }, { status: 404 });
  }

  // Fisher-Yates shuffle then take `count`
  const shuffled = [...students];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, count);

  const sent: string[] = [];
  const failed: string[] = [];

  for (const student of picked) {
    const flyerPath = `flyers/${student.id}.png`;

    // Generate a short-lived signed URL for this flyer
    const { data: signedData, error: signErr } = await db.storage
      .from('flyer-exports')
      .createSignedUrl(flyerPath, 120);

    if (signErr || !signedData?.signedUrl) {
      failed.push(student.full_name);
      continue;
    }

    // Fetch the PNG buffer
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) {
      failed.push(student.full_name);
      continue;
    }
    const pngBuffer = await fileRes.arrayBuffer();

    // Build multipart form data for Telegram sendPhoto
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append(
      'caption',
      `FYB of the Day\n\n${student.full_name}\n${student.matric_no}`
    );
    formData.append(
      'photo',
      new Blob([pngBuffer], { type: 'image/png' }),
      `${student.matric_no.replace(/\//g, '-')}_${student.full_name.replace(/\s+/g, '_')}.png`
    );

    const tgRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendPhoto`,
      { method: 'POST', body: formData }
    );

    if (tgRes.ok) {
      sent.push(student.full_name);
    } else {
      const tgBody = await tgRes.json().catch(() => ({}));
      console.error('Telegram error for', student.full_name, tgBody);
      failed.push(student.full_name);
    }
  }

  // Mark successfully sent students as dispatched
  if (sent.length > 0) {
    const sentIds = picked
      .filter((s) => sent.includes(s.full_name))
      .map((s) => s.id);

    await db
      .from('students')
      .update({ dispatched_at: new Date().toISOString() })
      .in('id', sentIds);
  }

  return NextResponse.json({
    sent: sent.length,
    names: sent,
    failed: failed.length > 0 ? failed : undefined,
  });
}
