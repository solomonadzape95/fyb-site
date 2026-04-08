import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createServerClient } from '@/lib/supabase';
import FlyerTemplate from '@/components/FlyerTemplate';
import { Student, FybAnswers } from '@/types/student';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

async function toBase64DataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

async function localAsBase64(filename: string, mime: string): Promise<string> {
  try {
    const buf = await readFile(join(process.cwd(), 'public', filename));
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return `/${filename}`;
  }
}

export default async function FlyerRenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (token !== process.env.INTERNAL_RENDER_TOKEN) {
    return notFound();
  }

  const db = createServerClient();

  const { data: student, error: studentError } = await db
    .from('students')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (studentError || !student) {
    return notFound();
  }

  const { data: answers } = await db
    .from('fyb_answers')
    .select('*')
    .eq('student_id', id)
    .single();

  // Convert all images to base64 so the page is fully self-contained for Puppeteer
  const rawPhotoUrl = (student as Student).photo_url || null;
  const [photoUrl, unnLogo, nacosLogo] = await Promise.all([
    rawPhotoUrl ? toBase64DataUrl(rawPhotoUrl) : Promise.resolve(null),
    localAsBase64('unn.png', 'image/png'),
    localAsBase64('nacos.png', 'image/png'),
  ]);

  return (
    <>
      <style>{`
        @import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Pacifico&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        /* Hide Next.js dev overlays from Puppeteer screenshots */
        nextjs-portal, [data-nextjs-dialog-overlay], [data-next-mark] { display: none !important; }
      `}</style>

      <FlyerTemplate
        student={student as Student}
        answers={(answers as Partial<FybAnswers>) || {}}
        showWatermark={false}
        highlightField={null}
        photoUrl={photoUrl}
        unnLogoUrl={unnLogo}
        nacosLogoUrl={nacosLogo}
      />
    </>
  );
}
