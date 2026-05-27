import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { verifyAdmin } from "@/lib/admin-auth";
import { getBrowser } from "@/lib/puppeteer";
import { getRenderBaseUrl, signPosterToken } from "@/lib/poster-render";
import type { PosterData } from "@/components/PosterTemplate";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeFilename(idx: number, name?: string | null) {
  const base = (name || "poster")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .replace(/ +/g, "_")
    .slice(0, 60) || "poster";
  return `${String(idx + 1).padStart(3, "0")}_${base}.png`;
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows?: PosterData[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rows = body.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows is required" }, { status: 400 });
  }

  const baseUrl = getRenderBaseUrl();
  const zip = new JSZip();
  let browser;
  try {
    browser = await getBrowser();

    const failures: { idx: number; name?: string | null; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const data = rows[i];
      const token = await signPosterToken(data);
      const renderUrl = `${baseUrl}/poster-render?token=${encodeURIComponent(token)}`;

      const page = await browser.newPage();
      try {
        await page.setViewport({ width: 1080, height: 1500, deviceScaleFactor: 1 });
        // `domcontentloaded` (not `networkidle0`) — Google Fonts @import + the
        // photo's base64 data URL never reach "0 open connections for 500ms"
        // reliably under load, so the old call timed out at 20s. We then wait
        // explicitly for images + fonts below, which is what we actually care
        // about for the screenshot.
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
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await new Promise((r) => setTimeout(r, 150));

        const buffer = await page.screenshot({
          type: "png",
          clip: { x: 0, y: 0, width: 1080, height: 1500 },
        });

        zip.file(safeFilename(i, data.full_name), buffer as Buffer);
      } catch (rowErr) {
        // Don't kill the whole batch over a single bad row — record and move on.
        const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
        console.error(
          `Poster ${i + 1}/${rows.length} (${data.full_name ?? "unknown"}) failed:`,
          msg,
        );
        failures.push({ idx: i, name: data.full_name, error: msg });
      } finally {
        await page.close();
      }
    }

    if (failures.length > 0) {
      zip.file(
        "_failures.txt",
        failures
          .map((f) => `Row ${f.idx + 1} (${f.name ?? "unknown"}): ${f.error}`)
          .join("\n"),
      );
    }

    const zipBuf = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
    });

    const date = new Date().toISOString().slice(0, 10);
    return new NextResponse(Buffer.from(zipBuf), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="fyb-posters-${date}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Bulk poster generation error:", err);
    return NextResponse.json(
      { error: "Bulk generation failed" },
      { status: 500 },
    );
  } finally {
    if (browser) await browser.close();
  }
}
