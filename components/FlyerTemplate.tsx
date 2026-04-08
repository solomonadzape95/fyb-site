import React from "react";
import { Student, FybAnswers } from "@/types/student";

export interface FlyerTemplateProps {
  student: Partial<Student>;
  answers: Partial<FybAnswers>;
  showWatermark?: boolean;
  highlightField?: string | null;
  photoUrl?: string | null;
  unnLogoUrl?: string | null;
  nacosLogoUrl?: string | null;
}

// ── Inline-only — NO Tailwind (breaks Puppeteer) ──
const FONT = '"Satoshi", "Inter", Arial, sans-serif';
// Comic Sans MS is available on Chromium; Comic Neue is the Google Fonts fallback
const FONT_COMIC = '"Comic Sans MS", "Comic Neue", "Chalkboard SE", cursive';
// Pacifico loaded via Google Fonts (globals.css + flyer-render style block)
const FONT_CURSIVE = '"Pacifico", cursive';

const C = {
  leftBg: "#0a1a0d",
  leftBgAlt: "#071409",
  gold: "#e8a820",
  green: "#1a5c2a",
  leftText: "#f5f5f5",
  leftMuted: "rgba(245,245,245,0.5)",
  notebook: "#fef9ee",
  lineColor: "#c5d5e8",
  marginRed: "#ffb3b3",
  label: "#1a5c2a",
  answer: "#1c1c1c",
  answerDim: "#999999",
} as const;

function ph(val: string | null | undefined, fallback: string) {
  return { text: val?.trim() || fallback, muted: !val?.trim() };
}

function hl(
  field: string,
  active: string | null | undefined,
): React.CSSProperties {
  return active === field
    ? { outline: `2px solid ${C.gold}`, outlineOffset: 1, borderRadius: 4 }
    : {};
}

const LINE_H = 32; // notebook line grid height (px)

const QUESTIONS: { field: keyof FybAnswers; label: string }[] = [
  { field: "hobbies", label: "Hobbies & Interests" },
  { field: "favourite_course", label: "Favourite Course" },
  { field: "most_challenging_course", label: "Most Challenging Course" },
  { field: "if_not_cs", label: "If Not Comp. Sci, What?" },
  { field: "favourite_lecturer", label: "Favourite Lecturer" },
  { field: "most_challenging_level", label: "Most Challenging Level" },
  { field: "best_level", label: "Best Level" },
  { field: "if_not_unn", label: "If Not UNN, Where?" },
  { field: "relationship_status", label: "Relationship Status" },
  { field: "best_memory", label: "Best Campus Memory" },
  { field: "advice_to_freshers", label: "Advice to 100L Students" },
  { field: "profession", label: "Aspiring / Current Profession" },
  { field: "fun_fact", label: "Fun Fact" },
];

const PLACEHOLDERS: Partial<Record<keyof FybAnswers, string>> = {
  hobbies: "Reading, coding, sports...",
  favourite_course: "Your favourite course",
  most_challenging_course: "MTH 301: Complex Analysis",
  if_not_cs: "Medicine, Law...",
  favourite_lecturer: "Dr. Someone",
  most_challenging_level: "300L",
  best_level: "100L",
  if_not_unn: "UNILAG, ABU...",
  relationship_status: "Single",
  best_memory: "Your most memorable experience",
  advice_to_freshers: "Words for the incoming class",
  profession: "Software Engineer, Entrepreneur...",
  fun_fact: "Something surprising about you",
};

const INK = "rgba(30,80,160,0.32)";

function PlatformIcon({ platform, size = 18 }: { platform?: string | null; size?: number }) {
  const s = size;
  if (platform === "Instagram") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/>
    </svg>
  );
  if (platform === "X") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  if (platform === "TikTok") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.79 1.52V6.77a4.85 4.85 0 0 1-1.02-.08z"/>
    </svg>
  );
  if (platform === "Snapchat") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.206 1c3.109 0 5.636 2.527 5.636 5.636v.908c.364-.091.636-.182.818-.182.546 0 1 .454 1 1 0 .818-.727 1.272-1.636 1.545.091.273.182.636.182 1 0 .273 0 .455-.091.636.546.182 1.545.636 1.545 1.454 0 .455-.364.818-.818.818-.273 0-.636-.091-1-.273-.818-.364-1.636-.636-2.272-.636-.273 0-.545.091-.818.273.273.364.455.818.455 1.272 0 1.636-1.818 3.091-4.909 3.545-.091.273-.182.636-.455.818-.273.182-.636.273-1 .273-.636 0-1.272-.273-1.636-.636-3.091-.454-4.909-1.909-4.909-3.545 0-.454.182-.908.455-1.272-.273-.182-.545-.273-.818-.273-.636 0-1.454.272-2.272.636-.364.182-.727.273-1 .273-.454 0-.818-.363-.818-.818 0-.818.999-1.272 1.545-1.454-.091-.181-.091-.363-.091-.636 0-.364.091-.727.182-1C1.127 9.726.4 9.272.4 8.454c0-.546.454-1 1-1 .182 0 .454.091.818.182v-.908C2.218 3.527 4.745 1 7.854 1c.818 0 1.636.182 2.363.545.364.182.727.273 1 .273.273 0 .636-.091 1-.273A4.42 4.42 0 0 1 14.57 1z"/>
    </svg>
  );
  if (platform === "LinkedIn") return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
  return null;
}

function DoodleStar({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17 5.8 21.3l2.4-7.4L2 9.4h7.6z"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoodleHeart({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21C12 21 3 14.5 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14.5 12 21 12 21z"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DoodleZap({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline
        points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DoodleSpiral({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12 C12 12, 16 8, 16 5 C16 2, 12 1, 9 3 C6 5, 5 9, 7 12 C9 15, 14 16, 17 14 C20 12, 20 7, 17 4"
        stroke={INK}
        strokeWidth={1.4}
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function DoodleFlower({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx={12} cy={12} r={2.5} stroke={INK} strokeWidth={1.2} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const cx2 = 12 + Math.cos(rad) * 5;
        const cy2 = 12 + Math.sin(rad) * 5;
        return (
          <circle
            key={deg}
            cx={cx2}
            cy={cy2}
            r={2}
            stroke={INK}
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

export default function FlyerTemplate({
  student,
  answers,
  showWatermark = true,
  highlightField = null,
  photoUrl = null,
  unnLogoUrl = null,
  nacosLogoUrl = null,
}: FlyerTemplateProps) {
  const photo = photoUrl || student.photo_url || null;
  const name = ph(student.full_name, "Your Full Name");
  const course = ph(student.course_of_study, "Computer Science");
  const nickname = ph(student.nickname, "Nickname");
  const dob = ph(student.dob, "14th March");
  const quote = ph(answers?.favourite_quote, '"Your favourite quote"');
  const social = ph(answers?.social_media_handle, "@your_handle");

  const FULL_W = 1080;
  const FULL_H = 1350;
  const LEFT_W = 580;
  const STRIP_W = 90;
  const RIGHT_W = FULL_W - LEFT_W - STRIP_W;

  return (
    <div
      style={{
        width: FULL_W,
        height: FULL_H,
        position: "relative",
        overflow: "hidden",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* ══════════════════════════
          LEFT — PHOTO PANEL
          ══════════════════════════ */}
      <div
        style={{
          width: LEFT_W,
          height: FULL_H,
          flexShrink: 0,
          background: C.leftBg,
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {/* Logos + dept name — single row */}
        <div
          style={{
            padding: "28px 20px", // More padding to emphasize height
            height: 92, // Increased from 60 to 92
            // flexShrink: 0,
            zIndex: 2,
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 18, // Bigger gap for added height
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={unnLogoUrl || "/unn.png"}
            alt="UNN"
            crossOrigin="anonymous"
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={nacosLogoUrl || "/nacos.png"}
            alt="NACOS"
            crossOrigin="anonymous"
            style={{
              width: 52,
              height: 52,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <div>
            <div
              style={{
                fontSize: 14, // Increased from 11 to 14
                fontWeight: 700,
                color: C.gold,
                letterSpacing: 1,
                textTransform: "uppercase",
                fontFamily: FONT,
              }}
            >
              Department of Computer Science
            </div>
            <div
              style={{
                fontSize: 14, // Increased from 11 to 14
                fontWeight: 500,
                color: C.leftMuted,
                letterSpacing: 0.3,
                textTransform: "uppercase",
                fontFamily: FONT,
              }}
            >
              University of Nigeria, Nsukka
            </div>
          </div>
        </div>

        {/* Photo */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt="Profile"
              crossOrigin="anonymous"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "top center",
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
                background: C.leftBgAlt,
                color: C.leftMuted,
                fontSize: 15,
                fontFamily: FONT,
              }}
            >
              Photo here
            </div>
          )}
          {/* Bottom fade */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 310,
              background: `linear-gradient(to top, ${C.leftBg} 0%, ${C.leftBg}bb 45%, transparent 100%)`,
              pointerEvents: "none",
            }}
          />
        </div>

        {/* Name + info overlay — pulled up over the fade */}
        <div
          style={{
            padding: "0 26px 28px",
            marginTop: -50,
            flexShrink: 0,
            position: "relative",
            zIndex: 2,
          }}
        >
          {/* "Meet" — large cursive, own line */}
          <div
            style={{
              fontFamily: FONT_CURSIVE,
              fontSize: 78,
              fontWeight: 400,
              color: C.gold,
              lineHeight: 1,
              marginBottom: 6,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            Meet
          </div>

          {/* Full name — own block, sits right below "Meet" */}
          <div
            style={{
              fontSize: 44,
              fontWeight: 900,
              color: name.muted ? C.leftMuted : C.leftText,
              fontFamily: FONT,
              lineHeight: 1.1,
              letterSpacing: -0.5,
              marginBottom: 22,
              ...hl("full_name", highlightField),
            }}
          >
            {name.text}
          </div>

          {/* Info grid — 2x2 layout */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px 24px",
            }}
          >
            <InfoItem
              label="Nickname"
              value={nickname.text}
              muted={nickname.muted}
              field="nickname"
              activeField={highlightField}
              valueColor={C.gold}
              italic
            />
            <InfoItem
              label="DOB"
              value={dob.text}
              muted={dob.muted}
              field="dob"
              activeField={highlightField}
              valueColor={C.leftText}
            />
            <InfoItem
              label="State"
              value={student.state_of_origin?.trim() || "State of origin"}
              muted={!student.state_of_origin?.trim()}
              field="state_of_origin"
              activeField={highlightField}
              valueColor={C.leftText}
            />
            {/* Socials — inline to show platform icon */}
            <div style={{ ...hl("social_media_handle", highlightField) }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(232,168,32,0.6)",
                  fontFamily: FONT,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                Socials
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: social.muted ? "rgba(232,168,32,0.35)" : C.gold,
                }}
              >
                {answers?.social_media_platform && (
                  <span style={{ flexShrink: 0 }}>
                    <PlatformIcon platform={answers.social_media_platform} size={18} />
                  </span>
                )}
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    fontFamily: FONT,
                    lineHeight: 1.25,
                  }}
                >
                  {social.text}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════
          CENTRE — VERTICAL STRIP
          ══════════════════════════ */}
      <div
        style={{
          width: STRIP_W,
          height: FULL_H,
          flexShrink: 0,
          background: C.green,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {/* Gold accent lines top/bottom */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 3,
            height: 80,
            background: `linear-gradient(to bottom, ${C.gold}, transparent)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: 3,
            height: 80,
            background: `linear-gradient(to top, ${C.gold}, transparent)`,
          }}
        />
        <div
          style={{
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            userSelect: "none",
          }}
        >
          {/*<span
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 62,
              letterSpacing: 3,
              color: C.leftText,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              textShadow: "0 0 12px rgba(0,0,0,0.4)",
            }}
          >
            NACOS 0&apos;26
          </span>*/}
          <span
            style={{
              fontFamily: FONT_CURSIVE,
              fontWeight: 400,
              fontSize: 62,
              // lineHeight: 1,
              letterSpacing: 3,
              color: C.gold,
              whiteSpace: "nowrap",
              textShadow: "0 0 20px rgba(232,168,32,0.35)",
            }}
          >
            FYB of The Day
          </span>
        </div>
      </div>

      {/* ══════════════════════════
          RIGHT — NOTEBOOK Q&A
          ══════════════════════════ */}
      <div
        style={{
          width: RIGHT_W,
          height: FULL_H,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          background: C.notebook,
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent ${LINE_H - 1}px,
            ${C.lineColor} ${LINE_H - 1}px,
            ${C.lineColor} ${LINE_H}px
          )`,
          backgroundPosition: `0 50px`,
          position: "relative",
        }}
      >
        {/* Red margin line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 54,
            width: 2,
            background: C.marginRed,
            zIndex: 1,
          }}
        />

        {/* Doodles — scattered around the notebook margins */}
        <div style={{ position: "absolute", top: 18, right: 14, zIndex: 3, pointerEvents: "none", opacity: 0.9 }}>
          <DoodleStar size={24} />
        </div>
        <div style={{ position: "absolute", top: 180, right: 18, zIndex: 3, pointerEvents: "none", opacity: 0.85 }}>
          <DoodleHeart size={22} />
        </div>
        <div style={{ position: "absolute", top: 10, left: 8, zIndex: 3, pointerEvents: "none", opacity: 0.75 }}>
          <DoodleSpiral size={20} />
        </div>
        <div style={{ position: "absolute", bottom: 260, right: 16, zIndex: 3, pointerEvents: "none", opacity: 0.85 }}>
          <DoodleZap size={20} />
        </div>
        <div style={{ position: "absolute", bottom: 80, right: 12, zIndex: 3, pointerEvents: "none", opacity: 0.8 }}>
          <DoodleFlower size={26} />
        </div>

        {/* Q&A body */}
        <div
          style={{
            flex: 1,
            padding: "10px 20px 8px 0",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            position: "relative",
            zIndex: 2,
          }}
        >
          {QUESTIONS.map((q, i) => {
            const val = ph(
              answers?.[q.field] as string | undefined,
              PLACEHOLDERS[q.field] || "...",
            );
            return (
              <div
                key={q.field}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  borderBottom:
                    i < QUESTIONS.length - 1
                      ? `1px solid rgba(0,0,0,0.07)`
                      : "none",
                  ...hl(q.field, highlightField),
                }}
              >
                {/* Number in the margin — left of the red line */}
                <div
                  style={{
                    width: 54,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT_COMIC,
                    fontSize: 22,
                    fontWeight: 700,
                    color: "rgba(30,80,160,0.45)",
                  }}
                >
                  {i + 1}
                </div>
                {/* Label + answer — right of the margin */}
                <div
                  style={{
                    flex: 1,
                    paddingLeft: 14,
                    paddingTop: 3,
                    paddingBottom: 3,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: C.label,
                      textTransform: "uppercase",
                      letterSpacing: 1.5,
                      fontFamily: FONT,
                      lineHeight: 1.25,
                      marginBottom: 2,
                    }}
                  >
                    {q.label}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 400,
                      color: val.muted ? C.answerDim : C.answer,
                      lineHeight: 1.25,
                      fontFamily: FONT_COMIC,
                    }}
                  >
                    {val.text}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════
          WATERMARK (preview only)
          ══════════════════════════ */}
      {showWatermark && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            zIndex: 10,
          }}
        >
          <div
            style={{
              transform: "rotate(-35deg)",
              fontSize: 80,
              fontWeight: 900,
              color: "rgba(0,0,0,0.06)",
              whiteSpace: "nowrap",
              letterSpacing: 8,
              fontFamily: FONT,
              lineHeight: 1.4,
              textAlign: "center",
            }}
          >
            PREVIEW
            <br />
            NOT FINAL
            <br />
            PREVIEW
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
  muted,
  field,
  activeField,
  valueColor,
  italic,
}: {
  label: string;
  value: string;
  muted: boolean;
  field: string;
  activeField: string | null | undefined;
  valueColor: string;
  italic?: boolean;
}) {
  return (
    <div style={{ ...hl(field, activeField) }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "rgba(232,168,32,0.6)",
          fontFamily: FONT,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 600,
          fontStyle: italic ? "italic" : "normal",
          color: muted ? C.leftMuted : valueColor,
          fontFamily: FONT,
          lineHeight: 1.25,
        }}
      >
        {value}
      </div>
    </div>
  );
}
