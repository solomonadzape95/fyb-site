import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function getBrowser() {
  if (process.env.NODE_ENV === 'development') {
    const puppeteer = await import('puppeteer');
    return puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }
  const chromium = await import('@sparticuz/chromium');
  const puppeteerCore = await import('puppeteer-core');
  return puppeteerCore.default.launch({
    args: chromium.default.args,
    executablePath: await chromium.default.executablePath(),
    headless: true,
  });
}

export async function POST(request: NextRequest) {
  let body: { student_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { student_id } = body;
  if (!student_id) {
    return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
  }

  const db = createServerClient();

  // Validate: student exists, is not locked
  const { data: student, error: studentError } = await db
    .from('students')
    .select('id, full_name, is_locked, has_submitted, deleted_at')
    .eq('id', student_id)
    .is('deleted_at', null)
    .single();

  if (studentError || !student) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 });
  }

  if (student.is_locked) {
    return NextResponse.json({ error: 'This record is locked. Contact the committee.' }, { status: 403 });
  }

  // Build the internal render URL
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const renderUrl = `${baseUrl}/flyer-render/${student_id}?token=${process.env.INTERNAL_RENDER_TOKEN}`;

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();

    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

    await page.goto(renderUrl, { waitUntil: 'networkidle0', timeout: 20000 });

    // Wait for profile photo to load (if present)
    try {
      await page.waitForSelector('img[data-loaded]', { timeout: 5000 });
      await page.evaluate(() =>
        Promise.all(
          Array.from(document.images).map(
            (img) =>
              img.complete ||
              new Promise<void>((resolve) => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
          )
        )
      );
    } catch {
      // No images or timeout — continue anyway
    }

    // Small delay for fonts/layout to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    const buffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1350 },
    });

    // Upload PNG buffer to private flyer-exports bucket
    const flyerPath = `flyers/${student_id}.png`;

    const { error: uploadError } = await db.storage
      .from('flyer-exports')
      .upload(flyerPath, buffer as Buffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to store flyer' }, { status: 500 });
    }

    // Save path to flyer_exports table (path only — never the full URL)
    await db.from('flyer_exports').upsert(
      { student_id, flyer_path: flyerPath },
      { onConflict: 'student_id' }
    );

    // Mark student as submitted
    await db
      .from('students')
      .update({
        has_submitted: true,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', student_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Flyer generation error:', err);
    return NextResponse.json({ error: 'Flyer generation failed. Please try again.' }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
