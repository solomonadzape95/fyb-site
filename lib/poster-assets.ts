import { readFile } from "fs/promises";
import { join } from "path";
import {
  driveThumbnailUrl,
  extractDriveFileId,
  isDriveUrl,
  isImageFile,
} from "@/lib/photo-match";

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

export async function localAsBase64(
  filename: string,
  mime: string,
): Promise<string> {
  try {
    const buf = await readFile(join(process.cwd(), "public", filename));
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return `/${filename}`;
  }
}

async function photoFolderAsBase64(filename: string): Promise<string | null> {
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return null;
  }
  if (!isImageFile(filename)) return null;
  try {
    const buf = await readFile(join(getPhotoDir(), filename));
    return `data:${mimeFor(filename)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// In-memory cache for Drive thumbnail fetches.
// Survives across requests in the same Node process — perfect for the ZIP
// builder which renders 100+ posters back to back.
const driveCache = new Map<string, string>();

async function driveAsBase64(url: string): Promise<string | null> {
  const id = extractDriveFileId(url);
  if (!id) return null;
  const cached = driveCache.get(id);
  if (cached) return cached;
  const thumb = driveThumbnailUrl(id, 1500);
  if (!thumb) return null;
  try {
    const res = await fetch(thumb, { redirect: "follow" });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.startsWith("image/")) return null; // Drive returned an HTML page → not public
    const buf = await res.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const dataUrl = `data:${ct};base64,${b64}`;
    driveCache.set(id, dataUrl);
    return dataUrl;
  } catch {
    return null;
  }
}

// Resolve a per-row photo input to a base64 data URL.
// Priority:
//   1. data: URL → use as-is
//   2. drive.google.com link → fetch via thumbnail endpoint
//   3. Bare filename → read from fyb-images/
//   4. Anything else (broken link, missing file) → test image
export async function resolvePhoto(
  input: string | null | undefined,
): Promise<string> {
  if (input) {
    if (input.startsWith("data:")) return input;
    if (isDriveUrl(input)) {
      const fromDrive = await driveAsBase64(input);
      if (fromDrive) return fromDrive;
    }
    if (!input.startsWith("http") && !input.startsWith("/")) {
      const fromFolder = await photoFolderAsBase64(input);
      if (fromFolder) return fromFolder;
    }
  }
  return localAsBase64("test-image.jpeg", "image/jpeg");
}
