// Helpers to match an Excel row's full_name against files inside fyb-images.
// File naming pattern observed: `<id> - <Full Name>(<n>).<ext>`. Some files
// have a `(1)` / `(2)` suffix to indicate multiple photos for the same person.

const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|heic)$/i;

export function isImageFile(name: string): boolean {
  return IMAGE_EXT_RE.test(name) && !name.startsWith(".");
}

export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Pull the human name out of a filename: strip extension, take part after the
// last " - " separator (drop the timestamp/id prefix), strip the "(N)" tag.
export function extractNameFromFilename(filename: string): string {
  const noExt = filename.replace(IMAGE_EXT_RE, "");
  const parts = noExt.split(" - ");
  const namePart = parts.length > 1 ? parts.slice(1).join(" - ") : parts[0];
  return namePart.replace(/\s*\(\d+\)\s*$/, "").trim();
}

export function fileMatchesName(filename: string, fullName: string): boolean {
  if (!fullName) return false;
  const fileName = normalizeName(extractNameFromFilename(filename));
  const target = normalizeName(fullName);
  if (!fileName || !target) return false;
  return fileName === target;
}

// For a given full name, return the subset of files that belong to that person.
export function photosForName(
  files: string[],
  fullName: string,
): string[] {
  return files.filter((f) => fileMatchesName(f, fullName));
}

// ── Google Drive URL helpers ────────────────────────────────

export function isDriveUrl(url: string): boolean {
  return /drive\.google\.com/.test(url);
}

// Pull the Drive file ID out of any common Drive URL form.
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  // /file/d/<ID>/...
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
  if (m1) return m1[1];
  // ?id=<ID> or &id=<ID>
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
  if (m2) return m2[1];
  // /open/<ID> (rare)
  const m3 = url.match(/\/open\/([a-zA-Z0-9_-]{20,})/);
  if (m3) return m3[1];
  return null;
}

// Build a public Drive thumbnail URL at a given pixel width.
export function driveThumbnailUrl(
  fileIdOrUrl: string,
  width: number = 1500,
): string | null {
  const id = fileIdOrUrl.includes("/") || fileIdOrUrl.includes("?")
    ? extractDriveFileId(fileIdOrUrl)
    : fileIdOrUrl;
  if (!id) return null;
  return `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
}
