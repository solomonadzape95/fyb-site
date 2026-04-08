import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@/lib/supabase';
import Papa from 'papaparse';

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

interface CsvRow {
  matric_no?: string;
  full_name?: string;
  course_of_study?: string;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const text = await file.text();

  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = parsed.data as CsvRow[];
  const errors: string[] = [];
  const validRows: { matric_no: string; full_name: string; course_of_study: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.matric_no?.trim() || !row.full_name?.trim() || !row.course_of_study?.trim()) {
      errors.push(`Row ${i + 2}: Missing required fields (matric_no: "${row.matric_no}", full_name: "${row.full_name}")`);
      continue;
    }
    validRows.push({
      matric_no: row.matric_no.trim().toUpperCase(),
      full_name: row.full_name.trim(),
      course_of_study: row.course_of_study.trim(),
    });
  }

  if (validRows.length === 0) {
    return NextResponse.json({ upserted: 0, errors }, { status: 400 });
  }

  const db = createServerClient();

  // Upsert in batches of 100
  const BATCH_SIZE = 100;
  let upserted = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const { error: upsertError, count } = await db
      .from('students')
      .upsert(batch, { onConflict: 'matric_no', count: 'exact' });

    if (upsertError) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${upsertError.message}`);
    } else {
      upserted += count || batch.length;
    }
  }

  return NextResponse.json({ upserted, errors });
}
