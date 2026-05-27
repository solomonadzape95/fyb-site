import { NextRequest, NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin-auth";
import { getBrowser } from "@/lib/puppeteer";
import { signPosterToken } from "@/lib/poster-render";
import type { PosterData } from "@/components/PosterTemplate";

export const runtime = "nodejs";
export const maxDuration = 30;

const FIELDS: (keyof PosterData)[] = [
  "full_name",
  "dob",
  "socials",
  "nickname",
  "hobbies",
  "state_of_origin",
  "tech_skill",
  "relationship_status",
  "cs_or_stats",
  "if_not_cs",
  "if_not_unn",
  "department_buddies",
  "best_course",
  "worst_course",
  "class_crush",
];

// 1×1 transparent gif. Used as the placeholder src in the rendered HTML so
// PosterTemplate emits an <img> element we can target. The real photo is
// swapped in via page.evaluate after navigation, bypassing URL size limits
// and the test-image fallback (which 404s on Vercel since test-image.jpeg
// isn't committed to git).
const TRANSPARENT_GIF =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const data: PosterData = {};
  for (const f of FIELDS) {
    const v = form.get(f);
    data[f] = typeof v === "string" ? v : "";
  }

  let photoDataUrl: string | null = null;
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    const buf = Buffer.from(await file.arrayBuffer());
    const mime =
      file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
    photoDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  }

  data.photo_url = TRANSPARENT_GIF;

  const token = await signPosterToken(data);
  // Use the actual originating host so puppeteer navigates back to THIS
  // instance — VERCEL_URL/NEXTAUTH_URL can point at a different deployment
  // whose INTERNAL_RENDER_TOKEN or /poster-render route may not match.
  const proto =
    request.headers.get("x-forwarded-proto") ||
    request.nextUrl.protocol.replace(":", "");
  const host = request.headers.get("host") || request.nextUrl.host;
  const renderUrl = `${proto}://${host}/poster-render?token=${encodeURIComponent(token)}`;

  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1500, deviceScaleFactor: 1 });
    // `domcontentloaded` instead of `networkidle0`: the photo + Google Fonts
    // @import keep a small trickle of network activity that `networkidle0`
    // waits for indefinitely. We rely on the explicit `document.images` and
    // `document.fonts.ready` awaits below to guarantee everything's painted.
    await page.goto(renderUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
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

    if (photoDataUrl) {
      await page.evaluate(
        (url: string) =>
          new Promise<void>((resolve) => {
            const img = document.querySelector(
              'img[alt="Finalist"]',
            ) as HTMLImageElement | null;
            if (!img) {
              resolve();
              return;
            }
            img.onload = () => resolve();
            img.onerror = () => resolve();
            img.src = url;
          }),
        photoDataUrl,
      );
    }

    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await new Promise((r) => setTimeout(r, 200));

    const buffer = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: 1080, height: 1500 },
    });

    const safeName =
      (data.full_name || "poster")
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
    console.error("Single-poster generation error:", err);
    return NextResponse.json(
      { error: "Poster generation failed" },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close();
  }
}
