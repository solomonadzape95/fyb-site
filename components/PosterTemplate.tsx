import React from "react";

export interface PosterData {
  full_name?: string | null;
  dob?: string | null;
  socials?: string | null;
  nickname?: string | null;
  hobbies?: string | null;
  state_of_origin?: string | null;
  tech_skill?: string | null;
  relationship_status?: string | null;
  cs_or_stats?: string | null;
  if_not_cs?: string | null;
  if_not_unn?: string | null;
  department_buddies?: string | null;
  best_course?: string | null;
  worst_course?: string | null;
  class_crush?: string | null;
  photo_url?: string | null;
}

export interface PosterTemplateProps {
  data: PosterData;
  photoUrl?: string | null;
  unnLogoUrl?: string | null;
  nacosLogoUrl?: string | null;
  starUrl?: string | null;
}

const FONT = '"Arapey", Georgia, "Times New Roman", serif';
const SCRIPT = '"Alex Brush", "Brush Script MT", cursive';
const SANS = '"Inter", "Helvetica Neue", Arial, sans-serif';

// Sampled from the empty / filled reference templates.
// Single canonical dark green — used for header text, field boxes, photo
// background, the lower bottom ribbon, and ribbon inset stripes.
const DARK_GREEN = "#053703";
const C = {
  bandGreen: "#3fae1f", // bright green of top wedges + upper bottom ribbon + field labels
  bandDark: DARK_GREEN, // darker green of the lower bottom ribbon
  headerGreen: DARK_GREEN, // dark green of header text
  darkBox: DARK_GREEN, // dark green of the value boxes & photo bg
  labelGreen: DARK_GREEN, // dark green — used for the cursive nickname
  ribbonStripe: DARK_GREEN, // inset stripe inside both bottom ribbons
  star: "#fde047", // sparkle yellow (now unused since star is a PNG)
  white: "#ffffff",
} as const;

const FULL_W = 1080;
const FULL_H = 1500;

function v(val: string | null | undefined) {
  return val?.trim() || "";
}

function boxValue(val: string | null | undefined): string {
  const t = val?.trim();
  return t && t.length > 0 ? t : "None";
}

// Title-case any input — handles mixed-case all-caps DB rows ("OZOEMENA …")
// and falls through hyphens / apostrophes cleanly ("o'brien" → "O'Brien").
function titleCase(s: string): string {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(
      /(^|[\s\-'])([a-z])/g,
      (_m, prefix: string, ch: string) => prefix + ch.toUpperCase(),
    );
}

// Pick a font size for the full name. Smaller than before, since the name now
// wraps onto a second line for long values.
function fitNameSize(name: string): number {
  const len = name.length;
  if (len <= 18) return 36;
  if (len <= 26) return 32;
  if (len <= 36) return 28;
  if (len <= 48) return 24;
  return 22;
}

// Alex Brush is a wide cursive — drop hard at moderate lengths so long
// nicknames stop hitting the ellipsis path. (Apply this AFTER title-casing
// so all-caps inputs like "OMIS BELLA" don't get measured at their original
// wider width.)
function fitNicknameSize(nick: string): number {
  const len = nick.length;
  if (len <= 6) return 100;
  if (len <= 9) return 86;
  if (len <= 12) return 72;
  if (len <= 16) return 58;
  if (len <= 20) return 46;
  if (len <= 26) return 38;
  return 30;
}

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTH_LONG = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

function formatDob(s: string): string {
  if (!s) return "";
  const trimmed = s.trim();
  let day: number | undefined;
  let monthIdx: number | undefined;

  const iso = trimmed.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (iso) {
    monthIdx = parseInt(iso[2], 10) - 1;
    day = parseInt(iso[3], 10);
  } else {
    const ddmm = trimmed.match(/(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?/);
    if (ddmm) {
      const a = parseInt(ddmm[1], 10);
      const b = parseInt(ddmm[2], 10);
      if (b >= 1 && b <= 12) {
        day = a;
        monthIdx = b - 1;
      } else if (a >= 1 && a <= 12) {
        day = b;
        monthIdx = a - 1;
      }
    } else {
      for (let i = 0; i < MONTH_LONG.length; i++) {
        const re = new RegExp(`\\b${MONTH_LONG[i].slice(0, 3)}[a-z]*\\b`, "i");
        if (re.test(trimmed)) {
          monthIdx = i;
          const dayMatch = trimmed.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/i);
          if (dayMatch) day = parseInt(dayMatch[1], 10);
          break;
        }
      }
    }
  }

  if (
    day !== undefined &&
    monthIdx !== undefined &&
    monthIdx >= 0 &&
    monthIdx < 12 &&
    day >= 1 &&
    day <= 31
  ) {
    return `${day} ${MONTH_SHORT[monthIdx]}`;
  }
  return trimmed
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SOCIAL_PLATFORM_RE =
  /\b(?:IG|FB|X|Twitter|TW|Sc|Snap|Snapchat|LinkedIn|LI|TikTok|TT|YT|YouTube|Threads|Bluesky|BS|Discord)\s*[:\-]/gi;

// A segment that, after stripping trailing punctuation, is JUST a platform
// name with no handle attached — e.g. "IG", "IG:", "Snap-", "linkedin".
const PLATFORM_NAME_ONLY_RE =
  /^(?:ig|fb|x|twitter|tw|sc|snap|snapchat|linkedin|li|tiktok|tt|yt|youtube|threads|bluesky|bs|discord)$/i;

function isPlatformOnly(seg: string): boolean {
  const clean = seg.replace(/[:\-\s]+$/g, "").trim();
  return PLATFORM_NAME_ONLY_RE.test(clean);
}

function firstSocial(s: string): string {
  if (!s) return "";
  const trimmed = s.trim();
  const split = trimmed
    .split(/\s*[,;|]\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (split.length > 1) {
    // CSV input commonly looks like "IG, @graceben" or
    // "IG, @graceben, FB, @gracebenfb" — alternating platform/handle. A
    // naive first-segment split returns just "IG", so detect that case
    // and stitch the platform onto the next segment instead.
    if (isPlatformOnly(split[0]) && split[1]) {
      const platform = split[0].replace(/[:\-\s]+$/g, "");
      return `${platform}: ${split[1]}`;
    }
    return split[0];
  }

  // No comma-style separator — try the inline "Platform: handle Platform: handle"
  // form and cut at the second platform marker.
  const matches = [...trimmed.matchAll(SOCIAL_PLATFORM_RE)];
  if (matches.length >= 2) {
    const secondIdx = matches[1].index ?? trimmed.length;
    return trimmed
      .slice(0, secondIdx)
      .trim()
      .replace(/[,;|]\s*$/, "");
  }
  return trimmed;
}

function joinBestWorst(best?: string | null, worst?: string | null) {
  const b = v(best);
  const w = v(worst);
  if (b && w) return `${b} / ${w}`;
  return b || w || "";
}

// ── Field box ───────────────────────────────────────────────

function LabelledBox({
  label,
  value,
  minBoxHeight = 68,
  labelSize = 26,
  valueSize = 26,
}: {
  label: string;
  value: string;
  minBoxHeight?: number;
  labelSize?: number;
  valueSize?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: labelSize,
          color: C.bandGreen,
          lineHeight: 1.05,
          letterSpacing: -0.1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          minHeight: minBoxHeight,
          width: "100%",
          background: C.darkBox,
          borderRadius: 4,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          fontFamily: FONT,
          fontWeight: 400,
          fontSize: valueSize,
          color: C.white,
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            width: "100%",
            display: "block",
            whiteSpace: "normal",
            wordBreak: "break-word",
            lineHeight: 1.2,
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

// ── Photo frame decoration ──────────────────────────────────
// Every edge of the photo gets the same treatment: two parallel lines, with
// the outer line (closer to the frame edge) longer than the inner line
// (closer to the photo).

function PhotoFrame({
  width,
  height,
  inset,
}: {
  width: number;
  height: number;
  inset: number;
}) {
  const lineW = 5;

  // All four edges follow the SAME pattern: two parallel lines, with the
  // outer one (closer to the frame edge) longer than the inner one (closer
  // to the photo). All centred on their axis.
  //
  //   • outer line: 78% of the relevant span (height for verticals,
  //                 width for horizontals)
  //   • inner line: 70% of the relevant span
  //   • outer offset: 0.2 × inset from the frame edge
  //   • inner offset: 0.55 × inset from the frame edge

  // Vertical lines (left + right) — sized by frame height
  const outerVH = height * 0.78;
  const innerVH = height * 0.7;
  const outerVTop = (height - outerVH) / 2;
  const innerVTop = (height - innerVH) / 2;

  // Horizontal lines (top + bottom) — sized by frame width
  const outerHW = width * 0.78;
  const innerHW = width * 0.7;
  const outerHLeft = (width - outerHW) / 2;
  const innerHLeft = (width - innerHW) / 2;

  const outerEdgeOffset = inset * 0.2;
  const innerEdgeOffset = inset * 0.55;

  return (
    <>
      {/* Top outer horizontal (longer) */}
      <div
        style={{
          position: "absolute",
          top: outerEdgeOffset,
          left: outerHLeft,
          width: outerHW,
          height: lineW,
          background: C.bandGreen,
        }}
      />
      {/* Top inner horizontal (shorter) */}
      <div
        style={{
          position: "absolute",
          top: innerEdgeOffset,
          left: innerHLeft,
          width: innerHW,
          height: lineW,
          background: C.bandGreen,
        }}
      />
      {/* Bottom outer horizontal (longer) */}
      <div
        style={{
          position: "absolute",
          bottom: outerEdgeOffset,
          left: outerHLeft,
          width: outerHW,
          height: lineW,
          background: C.bandGreen,
        }}
      />
      {/* Bottom inner horizontal (shorter) */}
      <div
        style={{
          position: "absolute",
          bottom: innerEdgeOffset,
          left: innerHLeft,
          width: innerHW,
          height: lineW,
          background: C.bandGreen,
        }}
      />
      {/* Left outer vertical (longer) */}
      <div
        style={{
          position: "absolute",
          left: outerEdgeOffset,
          top: outerVTop,
          width: lineW,
          height: outerVH,
          background: C.bandGreen,
        }}
      />
      {/* Left inner vertical (shorter) */}
      <div
        style={{
          position: "absolute",
          left: innerEdgeOffset,
          top: innerVTop,
          width: lineW,
          height: innerVH,
          background: C.bandGreen,
        }}
      />
      {/* Right outer vertical (longer) */}
      <div
        style={{
          position: "absolute",
          right: outerEdgeOffset,
          top: outerVTop,
          width: lineW,
          height: outerVH,
          background: C.bandGreen,
        }}
      />
      {/* Right inner vertical (shorter) */}
      <div
        style={{
          position: "absolute",
          right: innerEdgeOffset,
          top: innerVTop,
          width: lineW,
          height: innerVH,
          background: C.bandGreen,
        }}
      />
    </>
  );
}

// ── Bottom crossing ribbon ──────────────────────────────────

function BottomRibbon({
  rotate,
  top,
  zIndex = 1,
  fill,
  starUrl,
}: {
  rotate: number;
  top: number;
  zIndex?: number;
  fill: string;
  starUrl: string | null;
}) {
  const repeatCount = 6;
  return (
    <div
      style={{
        position: "absolute",
        left: "-14%",
        top,
        width: "128%",
        height: 108,
        transform: `rotate(${rotate}deg)`,
        zIndex,
        background: fill,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 30,
          whiteSpace: "nowrap",
          paddingLeft: 20,
        }}
      >
        {Array.from({ length: repeatCount }).map((_, i) => (
          <React.Fragment key={i}>
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                color: C.white,
                fontSize: 40,
                letterSpacing: 1,
              }}
            >
              FINALIST OF THE DAY
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={starUrl || "/star.png"}
              alt=""
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                display: "block",
                flexShrink: 0,
              }}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────

export default function PosterTemplate({
  data,
  photoUrl = null,
  unnLogoUrl = null,
  nacosLogoUrl = null,
  starUrl = null,
}: PosterTemplateProps) {
  const photo = photoUrl || data.photo_url || null;

  // ── Layout constants ────────────────────────────────────
  // Both columns are exactly the same width: each gets half of the available
  // body width (the canvas minus side padding minus the gap between them).
  const SIDE_PAD = 60;
  const TOP_WEDGE_H = 30;
  const HEADER_TEXT_TOP = 50;
  const BODY_TOP = 150;

  const colGap = 40;
  const colWidth = (FULL_W - SIDE_PAD * 2 - colGap) / 2; // 470 each
  const fieldsColWidth = colWidth;
  const PHOTO_FRAME_W = colWidth;
  const PHOTO_FRAME_H = Math.round(FULL_H * 0.4); // 600 — 40% of canvas height

  // Photo frame insets (white margin between the frame edge and the photo).
  const PHOTO_INSET = 44;
  const photoInnerW = PHOTO_FRAME_W - PHOTO_INSET * 2;
  const photoInnerH = PHOTO_FRAME_H - PHOTO_INSET * 2;

  // Bottom ribbons — pushed lower toward the canvas edge.
  // Upper ribbon (back, bright green) sits ~160px from the bottom.
  // Lower ribbon (front, darker green) sits ~90px from the bottom and partly
  // bleeds past the canvas edge, matching the reference template.
  const RIBBON_BACK_TOP = FULL_H - 90;
  const RIBBON_FRONT_TOP = FULL_H - 100;

  const nicknameRaw = v(data.nickname);
  const fullNameRaw = v(data.full_name);
  const displayName = fullNameRaw ? titleCase(fullNameRaw) : "";
  // Always title-case the nickname before rendering. Alex Brush is a cursive
  // face — uppercase letters in cursive look wrong AND occupy more width, so
  // an all-caps DB input like "OMIS BELLA" gets turned into "Omis Bella"
  // both for typography and to keep it inside the column.
  const nicknameDisplay = nicknameRaw ? titleCase(nicknameRaw) : "";
  const nameSize = fitNameSize(displayName);
  const nicknameSize = fitNicknameSize(nicknameDisplay);

  return (
    <div
      style={{
        width: FULL_W,
        height: FULL_H,
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
        background: C.white,
      }}
    >
      {/* ── Top-left wedge: top-left corner → mid-top point → lower-left corner ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.bandGreen,
          clipPath: `polygon(0 0, 50% 0, 0 ${TOP_WEDGE_H}px)`,
        }}
      />

      {/* ── Top-right wedge: starts at 80% (tip) → top-right corner → lower-right corner ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.bandGreen,
          clipPath: `polygon(80% 0, 100% 0, 100% ${TOP_WEDGE_H}px)`,
        }}
      />

      {/* ── Header logos + association line — centred horizontally ── */}
      <div
        style={{
          position: "absolute",
          top: HEADER_TEXT_TOP,
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={unnLogoUrl || "/unn.png"}
          alt="UNN"
          style={{ width: 64, height: 64, objectFit: "contain", flexShrink: 0 }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={nacosLogoUrl || "/nacos.png"}
          alt="NACOS"
          style={{ width: 64, height: 64, objectFit: "contain", flexShrink: 0 }}
        />
        <div
          style={{
            fontFamily: SANS,
            fontSize: 22,
            fontWeight: 700,
            color: C.headerGreen,
            lineHeight: 1.05,
            letterSpacing: -0.6,
            marginLeft: 14,
          }}
        >
          NIGERIA ASSOCIATION OF COMPUTING STUDENTS
          <br />
          (NACOS) UNIVERSITY OF NIGERIA NSUKKA
        </div>
      </div>

      {/* ── Body: two columns of equal width. No fixed bottom — body sizes
            to its taller column so both columns end at the same y, which
            lets the right column's crush+socials align with the left
            column's last field. ── */}
      <div
        style={{
          position: "absolute",
          top: BODY_TOP,
          left: SIDE_PAD,
          right: SIDE_PAD,
          display: "flex",
          alignItems: "stretch",
          gap: colGap,
        }}
      >
        {/* Left column — 10 labelled boxes */}
        <div
          style={{
            width: fieldsColWidth,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <LabelledBox label="D.O.B" value={formatDob(boxValue(data.dob))} />
          <LabelledBox label="Hobbies" value={boxValue(data.hobbies)} />
          <LabelledBox
            label="State of Origin"
            value={boxValue(data.state_of_origin)}
          />
          <LabelledBox label="Tech Skills" value={boxValue(data.tech_skill)} />
          <LabelledBox
            label="Relationship Status"
            value={boxValue(data.relationship_status)}
          />
          <LabelledBox
            label="Computer Science/Statistics"
            value={boxValue(data.cs_or_stats)}
          />
          <LabelledBox
            label="If not CS, where else?"
            value={boxValue(data.if_not_cs)}
          />
          <LabelledBox
            label="If not UNN, where else?"
            value={boxValue(data.if_not_unn)}
          />
          <LabelledBox
            label="Best course/worst course"
            value={joinBestWorst(data.best_course, data.worst_course) || "None"}
          />
          <LabelledBox
            label="Department buddies"
            value={boxValue(data.department_buddies)}
          />
        </div>

        {/* Right column — photo (top) + name + nickname (middle) + crush + socials (bottom) */}
        <div
          style={{
            width: PHOTO_FRAME_W,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Photo block with green bracket frame + corner sparkle */}
          <div
            style={{
              position: "relative",
              width: PHOTO_FRAME_W,
              height: PHOTO_FRAME_H,
            }}
          >
            {/* Photo container */}
            <div
              style={{
                position: "absolute",
                left: PHOTO_INSET,
                top: PHOTO_INSET,
                width: photoInnerW,
                height: photoInnerH,
                background: C.darkBox,
                overflow: "hidden",
              }}
            >
              {photo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={photo}
                  alt="Finalist"
                  data-loaded="1"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: C.white,
                    fontFamily: FONT,
                    fontSize: 22,
                    opacity: 0.7,
                  }}
                >
                  No photo
                </div>
              )}
            </div>
            {/* Decorative frame on top */}
            <PhotoFrame
              width={PHOTO_FRAME_W}
              height={PHOTO_FRAME_H}
              inset={PHOTO_INSET}
            />
            {/* Sparkle cluster at the top-left of the photo block */}
            <div
              style={{
                position: "absolute",
                left: PHOTO_INSET - 56,
                top: PHOTO_INSET - 56,
                width: 120,
                height: 120,
                zIndex: 3,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={starUrl || "/star.png"}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          </div>

          {/* Name + nickname */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              marginTop: 2,
            }}
          >
            <div
              style={{
                fontFamily: FONT,
                fontSize: nameSize,
                fontWeight: 700,
                color: C.darkBox,
                lineHeight: 1.15,
                width: "100%",
                textAlign: "center",
                whiteSpace: "normal",
                wordBreak: "break-word",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {displayName}
            </div>
            {nicknameDisplay && (
              <div
                style={{
                  fontFamily: SCRIPT,
                  fontSize: nicknameSize,
                  color: C.bandGreen,
                  lineHeight: 1,
                  marginTop: -4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                }}
              >
                {nicknameDisplay}
              </div>
            )}
          </div>

          {/* Department crush + Socials — pushed to the bottom so it aligns
              with the bottom of the last field in the left column */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: "auto",
            }}
          >
            <LabelledBox
              label="Department crush"
              value={boxValue(data.class_crush)}
            />
            <LabelledBox
              label="Socials"
              value={firstSocial(boxValue(data.socials))}
            />
          </div>
        </div>
      </div>

      {/* ── Bottom crossing ribbons ── */}
      {/* Upper of the two (drawn first; lower z-index) — bright green */}
      <BottomRibbon
        rotate={-5}
        top={RIBBON_BACK_TOP}
        zIndex={2}
        fill={C.bandGreen}
        starUrl={starUrl}
      />
      {/* Lower of the two — darker green, sits on top at the crossing */}
      <BottomRibbon
        rotate={7}
        top={RIBBON_FRONT_TOP}
        zIndex={1}
        fill={C.bandDark}
        starUrl={starUrl}
      />
    </div>
  );
}
