"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PosterTemplate, { type PosterData } from "@/components/PosterTemplate";

const BG = "#0e0e0e";
const SURFACE = "#181818";
const BORDER = "rgba(255,255,255,0.08)";
const GOLD = "#f0b429";
const GREEN = "#22c55e";
const TEXT = "#f5f5f5";
const MUTED = "#9ca3af";

const POSTER_W = 1080;
const POSTER_H = 1500;
const PREVIEW_W = 380;
const PREVIEW_SCALE = PREVIEW_W / POSTER_W;

type Field = {
  key: keyof PosterData;
  label: string;
  placeholder?: string;
};

const FIELDS: Field[] = [
  { key: "full_name", label: "Full Name", placeholder: "Jane Doe" },
  { key: "dob", label: "D.O.B", placeholder: "18 Apr or 1999-04-18" },
  { key: "socials", label: "Socials", placeholder: "IG: @jane" },
  { key: "nickname", label: "Nickname" },
  { key: "hobbies", label: "Hobbies" },
  { key: "state_of_origin", label: "State of Origin" },
  { key: "tech_skill", label: "Tech Skill" },
  { key: "relationship_status", label: "Relationship Status" },
  { key: "cs_or_stats", label: "Computer Science / Statistics" },
  { key: "if_not_cs", label: "If not CS, where else?" },
  { key: "if_not_unn", label: "If not UNN, where else?" },
  { key: "department_buddies", label: "Department buddies" },
  { key: "best_course", label: "Best Course" },
  { key: "worst_course", label: "Worst Course" },
  { key: "class_crush", label: "Class Crush" },
];

const EMPTY: PosterData = FIELDS.reduce((acc, f) => {
  acc[f.key] = "";
  return acc;
}, {} as PosterData);

export default function AdminSinglePosterPage() {
  const [data, setData] = useState<PosterData>(EMPTY);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const update = useCallback(
    (key: keyof PosterData, value: string) =>
      setData((d) => ({ ...d, [key]: value })),
    [],
  );

  const handleImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setImageFile(f && f.size > 0 ? f : null);
  }, []);

  async function download() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      if (imageFile) fd.append("image", imageFile);
      for (const f of FIELDS) {
        fd.append(f.key, (data[f.key] || "").toString());
      }
      const res = await fetch("/api/generate-poster-single", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || `Failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = (data.full_name || "poster")
        .replace(/[^a-zA-Z0-9 ]/g, "")
        .replace(/ +/g, "_");
      a.download = `${safe || "poster"}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setBusy(false);
    }
  }

  const previewHeight = useMemo(() => POSTER_H * PREVIEW_SCALE, []);
  const previewPhoto = imagePreview || "/test-image.jpeg";

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
            href="/admin/posters"
            className="text-sm font-medium"
            style={{ color: MUTED }}
          >
            Back
          </Link>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
          <span className="font-bold text-sm" style={{ color: TEXT }}>
            Single Poster
          </span>
          <div className="ml-auto">
            <button
              onClick={download}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg font-bold text-xs disabled:opacity-50"
              style={{ background: GOLD, color: "#0e0e0e" }}
            >
              {busy ? "Generating..." : "Download PNG"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form column */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black mb-1" style={{ color: TEXT }}>
              Single Poster
            </h1>
            <p className="text-sm" style={{ color: MUTED }}>
              Upload one photo, fill in the fields, hit Download. Empty fields
              show as &quot;None&quot; on the poster.
            </p>
          </div>

          <div
            className="rounded-2xl p-5 space-y-3"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <label className="block">
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: MUTED }}
              >
                Photo
              </div>
              <div
                className="rounded-xl p-4 text-center cursor-pointer"
                style={{
                  border: `2px dashed ${BORDER}`,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <p className="text-sm" style={{ color: MUTED }}>
                  {imageFile
                    ? imageFile.name
                    : "Click to select an image (jpg, png, webp)"}
                </p>
                {imageFile && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "rgba(255,255,255,0.4)" }}
                  >
                    {(imageFile.size / 1024).toFixed(0)} KB · {imageFile.type}
                  </p>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImage}
                className="hidden"
              />
            </label>
            {imageFile && (
              <button
                onClick={() => setImageFile(null)}
                className="text-xs font-semibold"
                style={{ color: MUTED }}
              >
                Clear photo
              </button>
            )}
          </div>

          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: MUTED }}
                >
                  {f.label}
                </div>
                <input
                  type="text"
                  value={(data[f.key] || "") as string}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${BORDER}`,
                    color: TEXT,
                  }}
                />
              </label>
            ))}
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm font-medium"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={download}
            disabled={busy}
            className="w-full px-4 py-3 rounded-xl font-bold text-sm disabled:opacity-50"
            style={{ background: GREEN, color: "#0e0e0e" }}
          >
            {busy ? "Generating poster..." : "Download PNG"}
          </button>
        </div>

        {/* Preview column */}
        <div className="lg:sticky lg:top-20 self-start">
          <div
            className="text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: MUTED }}
          >
            Preview
          </div>
          <div
            className="rounded-2xl overflow-hidden mx-auto"
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              width: PREVIEW_W,
            }}
          >
            <div
              style={{
                width: PREVIEW_W,
                height: previewHeight,
                overflow: "hidden",
                background: "#fff",
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
                  data={data}
                  photoUrl={previewPhoto}
                  unnLogoUrl="/unn.png"
                  nacosLogoUrl="/nacos.png"
                />
              </div>
            </div>
          </div>
          <p
            className="text-xs mt-3 text-center"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            Live preview — final PNG is rendered server-side at 1080×1500
          </p>
        </div>
      </div>
    </div>
  );
}
