import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@/lib/supabase';
import JSZip from 'jszip';

export const maxDuration = 30;

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

  // Fetch all generated flyers with student info
  const { data: exports, error } = await db
    .from('flyer_exports')
    .select(`
      flyer_path,
      students ( full_name, matric_no )
    `);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch flyers' }, { status: 500 });
  }

  if (!exports || exports.length === 0) {
    return NextResponse.json({ error: 'No flyers generated yet' }, { status: 404 });
  }

  const zip = new JSZip();

  // Download all flyers in parallel (batched to avoid overwhelming Supabase)
  const BATCH_SIZE = 10;
  for (let i = 0; i < exports.length; i += BATCH_SIZE) {
    const batch = exports.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (row) => {
        try {
          const { data: signedData } = await db.storage
            .from('flyer-exports')
            .createSignedUrl(row.flyer_path, 120);

          if (!signedData?.signedUrl) return;

          const fileRes = await fetch(signedData.signedUrl);
          if (!fileRes.ok) return;

          const buffer = await fileRes.arrayBuffer();

          // Filename: MATRIC_FULLNAME.png
          const student = (Array.isArray(row.students) ? row.students[0] : row.students) as { full_name: string; matric_no: string } | null;
          const safeMatric = (student?.matric_no || 'unknown').replace(/\//g, '-');
          const safeName = (student?.full_name || 'student').replace(/[^a-zA-Z0-9 ]/g, '').replace(/ +/g, '_');
          const filename = `${safeMatric}_${safeName}.png`;

          zip.file(filename, buffer);
        } catch {
          // Skip failed files
        }
      })
    );
  }

  const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });

  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(zipBuffer), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="fyb-flyers-${date}.zip"`,
      'Cache-Control': 'no-store',
    },
  });
}
