import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { verifyAdmin } from "@/lib/admin-auth";
import { driveThumbnailUrl, isImageFile } from "@/lib/photo-match";

export const runtime = "nodejs";

function getPhotoDir(): string {
  return join(process.cwd(), "..", "fyb-images");
}

function mimeFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic") return "image/heic";
  return "image/jpeg";
}

// In-memory cache so the same Drive file isn't fetched repeatedly while the
// admin scrolls the preview grid.
const driveCache = new Map<string, { ct: string; bytes: Uint8Array }>();

async function serveDrive(fileId: string, sizePx: number) {
  if (!/^[a-zA-Z0-9_-]{20,}$/.test(fileId)) {
    return NextResponse.json({ error: "Invalid drive id" }, { status: 400 });
  }
  const cacheKey = `${fileId}@${sizePx}`;
  const cached = driveCache.get(cacheKey);
  if (cached) {
    return new NextResponse(new Uint8Array(cached.bytes), {
      headers: {
        "Content-Type": cached.ct,
        "Cache-Control": "private, max-age=300",
      },
    });
  }
  const thumb = driveThumbnailUrl(fileId, sizePx);
  if (!thumb) {
    return NextResponse.json({ error: "Invalid drive id" }, { status: 400 });
  }
  try {
    const res = await fetch(thumb, { redirect: "follow" });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Drive responded ${res.status}` },
        { status: 502 },
      );
    }
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) {
      return NextResponse.json(
        { error: "Drive returned a non-image (file may not be public)" },
        { status: 502 },
      );
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    driveCache.set(cacheKey, { ct, bytes });
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("drive proxy error:", err);
    return NextResponse.json({ error: "Drive fetch failed" }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl;
  const drive = url.searchParams.get("drive");
  if (drive) {
    const size = Number(url.searchParams.get("sz")) || 800;
    return serveDrive(drive, Math.min(Math.max(size, 100), 2000));
  }

  const name = url.searchParams.get("name") || "";
  if (!name || name.includes("/") || name.includes("\\") || name.includes("..")) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  if (!isImageFile(name)) {
    return NextResponse.json({ error: "Not an image" }, { status: 400 });
  }

  try {
    const buf = await readFile(join(getPhotoDir(), name));
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": mimeFor(name),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
