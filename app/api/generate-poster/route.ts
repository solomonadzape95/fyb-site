import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getBrowser } from "@/lib/puppeteer";
import { getRenderBaseUrl, signPosterToken } from "@/lib/poster-render";
import type { PosterData } from "@/components/PosterTemplate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { data?: PosterData };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = body.data;
  if (!data) {
    return NextResponse.json({ error: "data is required" }, { status: 400 });
  }

  const token = await signPosterToken(data);
  const renderUrl = `${getRenderBaseUrl()}/poster-render?token=${encodeURIComponent(token)}`;

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1500, deviceScaleFactor: 1 });
    await page.goto(renderUrl, { waitUntil: "networkidle0", timeout: 20000 });
    await page.evaluate(() =>
      Promise.all(
        Array.from(document.images).map(
          (img) =>
            img.complete ||
            new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            }),
        ),
      ),
    );
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await new Promise((r) => setTimeout(r, 200));

    const buffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1080, height: 1500 },
    });

    const safeName = (data.full_name || "poster")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .replace(/ +/g, "_")
      .slice(0, 60) || "poster";

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${safeName}.png"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Poster generation error:", err);
    return NextResponse.json(
      { error: "Poster generation failed" },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close();
  }
}
