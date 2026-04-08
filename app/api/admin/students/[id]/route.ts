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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const db = createServerClient();

  // Soft delete — set deleted_at
  await db
    .from('students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
