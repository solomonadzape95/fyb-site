"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import PosterTemplate from "@/components/PosterTemplate";
import { mapRow } from "@/lib/poster-mapping";
import {
  extractDriveFileId,
  isDriveUrl,
  photosForName,
} from "@/lib/photo-match";
import type { PosterData } from "@/components/PosterTemplate";

const BG = "#0e0e0e";
const SURFACE = "#181818";
const BORDER = "rgba(255,255,255,0.08)";
const GOLD = "#f0b429";
const GREEN = "#22c55e";
const TEXT = "#f5f5f5";
const MUTED = "#9ca3af";

const POSTER_W = 1080;
const POSTER_H = 1500;
const PREVIEW_W = 340; // displayed width per poster card
const PREVIEW_SCALE = PREVIEW_W / POSTER_W;

async function fetchPhotoList(): Promise<string[]> {
  try {
    const res = await fetch("/api/list-photos");
    if (!res.ok) return [];
    const { files } = (await res.json()) as { files?: string[] };
    return Array.isArray(files) ? files : [];
  } catch {
    return [];
  }
}

// Expand each row into one entry per matched photo.
// Priority for a row's photo:
//   1. Local file(s) in fyb-images that match the full name — one entry per file
//   2. The Drive URL from the Excel — used as-is (server-side fetcher inlines it)
//   3. Nothing → falls back to test image at render time
function expandRowsByPhoto(
  rows: PosterData[],
  files: string[],
): PosterData[] {
  const out: PosterData[] = [];
  for (const row of rows) {
    const matches = photosForName(files, row.full_name || "");
    if (matches.length > 0) {
      for (const file of matches) {
        out.push({ ...row, photo_url: file });
      }
    } else if (row.photo_url && isDriveUrl(row.photo_url)) {
      out.push({ ...row });
    } else {
      out.push({ ...row, photo_url: "" });
    }
  }
  return out;
}

export default function AdminPostersPage() {
  const [rows, setRows] = useState<PosterData[]>([]);
  const [parseError, setParseError] = useState("");
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [busyAll, setBusyAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [photoMatchInfo, setPhotoMatchInfo] = useState<string>("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    setRows([]);
    setPhotoMatchInfo("");
    setSearchTerm("");

    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");

    const finish = async (raw: Record<string, string>[]) => {
      const mapped = raw
        .map(mapRow)
        .filter((r) => (r.full_name || "").trim().length > 0);
      if (mapped.length === 0) {
        setParseError(
          "No rows with a 'Full Name' value were found. Check the column headers in your sheet.",
        );
        return;
      }

      const files = await fetchPhotoList();
      const expanded = expandRowsByPhoto(mapped, files);
      const fromLocal = expanded.filter(
        (r) => r.photo_url && !isDriveUrl(r.photo_url),
      ).length;
      const fromDrive = expanded.filter(
        (r) => r.photo_url && isDriveUrl(r.photo_url),
      ).length;
      const noPhoto = expanded.length - fromLocal - fromDrive;
      setRows(expanded);
      setPhotoMatchInfo(
        `${fromLocal} local + ${fromDrive} from Drive` +
          (noPhoto ? `, ${noPhoto} fell back to the test image` : "") +
          ` · ${files.length} files in fyb-images/, ${mapped.length} rows in sheet.`,
      );
    };

    if (isCsv) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => finish(res.data),
        error: (err) => setParseError(err.message),
      });
      return;
    }

    // xlsx / xls
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const buf = ev.target?.result as ArrayBuffer;
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
          defval: "",
          raw: false,
        });
        finish(json);
      } catch (err) {
        setParseError(
          err instanceof Error ? err.message : "Failed to parse spreadsheet",
        );
      }
    };
    reader.onerror = () => setParseError("Failed to read file");
    reader.readAsArrayBuffer(file);
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.nickname, r.socials, r.photo_url]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [rows, searchTerm]);

  async function downloadOne(row: PosterData, rowKey: number) {
    if (busyIndex !== null || busyAll) return;
    setBusyIndex(rowKey);
    try {
      const res = await fetch("/api/generate-poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: row }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || `Failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (row.full_name || "poster")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/ +/g, "_");
      a.download = `${safe}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusyIndex(null);
    }
  }

  async function downloadAll() {
    if (busyAll || busyIndex !== null || filteredRows.length === 0) return;
    setBusyAll(true);
    try {
      const res = await fetch("/api/generate-posters-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: filteredRows }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error || `Failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fyb-posters-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusyAll(false);
    }
  }

  const previewHeight = useMemo(() => POSTER_H * PREVIEW_SCALE, []);

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div
        className="sticky top-0 z-30"
        style={{
          background: "rgba(14,14,14,0.95)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="text-sm font-medium"
            style={{ color: MUTED }}
          >
            Back
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span className="font-bold text-sm" style={{ color: TEXT }}>
            Finalist Posters
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/admin/posters/single"
              className="px-3 py-1.5 rounded-lg font-bold text-xs"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: `1px solid ${BORDER}`,
                color: TEXT,
              }}
            >
              Single
            </Link>
            {rows.length > 0 && (
              <>
                <span className="text-xs" style={{ color: MUTED }}>
                  {filteredRows.length} of {rows.length}
                </span>
                <button
                  onClick={downloadAll}
                  disabled={busyAll || busyIndex !== null || filteredRows.length === 0}
                  className="px-3 py-1.5 rounded-lg font-bold text-xs disabled:opacity-50"
                  style={{ background: GOLD, color: "#0e0e0e" }}
                  title={
                    searchTerm
                      ? "Downloads only the rows matching your search"
                      : "Downloads all rows"
                  }
                >
                  {busyAll
                    ? "Building ZIP..."
                    : searchTerm
                      ? `Download ${filteredRows.length} (ZIP)`
                      : "Download all (ZIP)"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black mb-1" style={{ color: TEXT }}>
            Finalist Posters
          </h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Upload the Google-Form responses spreadsheet (.xlsx or .csv). Photos
            are matched from <code className="text-xs">fyb-images/</code> by full
            name — if a person has 2 photos there, 2 posters are produced.
          </p>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <label className="block cursor-pointer">
            <div
              className="rounded-xl p-8 text-center"
              style={{
                border: `2px dashed ${BORDER}`,
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <p className="font-semibold" style={{ color: MUTED }}>
                Click to select an .xlsx, .xls or .csv file
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "rgba(255,255,255,0.18)" }}
              >
                Column headers from the form are matched automatically
              </p>
            </div>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>

        {parseError && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-medium"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fca5a5",
            }}
          >
            {parseError}
          </div>
        )}

        {rows.length > 0 && (
          <>
            {photoMatchInfo && (
              <div
                className="rounded-xl px-4 py-3 text-xs"
                style={{
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.18)",
                  color: GREEN,
                }}
              >
                {photoMatchInfo}
              </div>
            )}

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, nickname, social handle or photo file…"
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium focus:outline-none"
                style={{
                  background: SURFACE,
                  border: `1px solid ${BORDER}`,
                  color: TEXT,
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-xs font-semibold px-3 py-2 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: MUTED,
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  Clear
                </button>
              )}
            </div>

            {filteredRows.length === 0 ? (
              <div className="text-sm py-12 text-center" style={{ color: MUTED }}>
                No rows match &quot;{searchTerm}&quot;.
              </div>
            ) : (
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${PREVIEW_W}px, 1fr))`,
                }}
              >
                {filteredRows.map((row, i) => {
                  let previewPhoto = "/test-image.jpeg";
                  if (row.photo_url) {
                    if (isDriveUrl(row.photo_url)) {
                      const id = extractDriveFileId(row.photo_url);
                      previewPhoto = id ? `/api/photo?drive=${id}&sz=800` : "/test-image.jpeg";
                    } else {
                      previewPhoto = `/api/photo?name=${encodeURIComponent(row.photo_url)}`;
                    }
                  }
                  return (
                    <div
                      key={`${row.full_name}-${row.photo_url || "no-photo"}-${i}`}
                      className="rounded-2xl overflow-hidden flex flex-col"
                      style={{
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                      }}
                    >
                      {/* Preview — scaled-down render of the real template */}
                      <div
                        style={{
                          width: PREVIEW_W,
                          height: previewHeight,
                          overflow: "hidden",
                          background: "#fff",
                          alignSelf: "center",
                        }}
                      >
                        <div
                          style={{
                            width: POSTER_W,
                            height: POSTER_H,
                            transform: `scale(${PREVIEW_SCALE})`,
                            transformOrigin: "top left",
                          }}
                        >
                          <PosterTemplate
                            data={row}
                            photoUrl={previewPhoto}
                            unnLogoUrl="/unn.png"
                            nacosLogoUrl="/nacos.png"
                          />
                        </div>
                      </div>
                      <div
                        className="px-4 py-3 flex items-center gap-3"
                        style={{ borderTop: `1px solid ${BORDER}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div
                            className="font-bold text-sm truncate"
                            style={{ color: TEXT }}
                          >
                            {row.full_name || "(no name)"}
                          </div>
                          <div
                            className="text-xs truncate"
                            style={{ color: row.photo_url ? MUTED : "#fca5a5" }}
                            title={row.photo_url || "no matching photo"}
                          >
                            {!row.photo_url
                              ? "no matching photo"
                              : isDriveUrl(row.photo_url)
                                ? "Drive photo"
                                : row.photo_url}
                          </div>
                        </div>
                        <button
                          onClick={() => downloadOne(row, i)}
                          disabled={busyIndex !== null || busyAll}
                          className="px-3 py-1.5 rounded-lg font-bold text-xs disabled:opacity-50"
                          style={{ background: GREEN, color: "#0e0e0e" }}
                        >
                          {busyIndex === i ? "..." : "PNG"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
