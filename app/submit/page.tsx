"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Student, FybAnswers } from "@/types/student";
import FlyerTemplate from "@/components/FlyerTemplate";

interface FormState {
  nickname: string;
  dob_day: string;
  dob_month: string;
  state_of_origin: string;
  relationship_status: string;
  hobbies: string;
  favourite_course: string;
  favourite_lecturer: string;
  most_challenging_level: string;
  most_challenging_course: string;
  best_level: string;
  best_memory: string;
  advice_to_freshers: string;
  if_not_unn: string;
  if_not_cs: string;
  profession: string;
  favourite_quote: string;
  fun_fact: string;
  social_media_platform: string;
  social_media_handle: string;
}

const INITIAL_FORM: FormState = {
  nickname: "",
  dob_day: "",
  dob_month: "",
  state_of_origin: "",
  relationship_status: "",
  hobbies: "",
  favourite_course: "",
  favourite_lecturer: "",
  most_challenging_level: "",
  most_challenging_course: "",
  best_level: "",
  best_memory: "",
  advice_to_freshers: "",
  if_not_unn: "",
  if_not_cs: "",
  profession: "",
  favourite_quote: "",
  fun_fact: "",
  social_media_platform: "",
  social_media_handle: "",
};

const REQUIRED_FIELDS: (keyof FormState)[] = [
  "dob_day",
  "dob_month",
  "state_of_origin",
  "relationship_status",
  "hobbies",
  "favourite_course",
  "most_challenging_level",
  "most_challenging_course",
  "best_level",
  "best_memory",
  "advice_to_freshers",
  "if_not_unn",
  "if_not_cs",
  "profession",
];

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAYS = Array.from({ length: 31 }, (_, i) => {
  const n = i + 1;
  const s = n === 1 || n === 21 || n === 31 ? "st"
    : n === 2 || n === 22 ? "nd"
    : n === 3 || n === 23 ? "rd"
    : "th";
  return { value: String(n), label: `${n}${s}` };
});

const LEVELS = ["100L", "200L", "300L", "400L", "500L"];

const SOCIAL_PLATFORMS = ["Instagram", "X", "TikTok", "Snapchat", "LinkedIn"];

function dobFromParts(day: string, month: string): string {
  if (!day || !month) return "";
  const n = parseInt(day, 10);
  const s = n === 1 || n === 21 || n === 31 ? "st"
    : n === 2 || n === 22 ? "nd"
    : n === 3 || n === 23 ? "rd"
    : "th";
  return `${n}${s} ${month}`;
}

function dobToParts(dob: string): { day: string; month: string } {
  if (!dob) return { day: "", month: "" };
  const match = dob.match(/^(\d+)\w+\s+(\w+)$/);
  if (!match) return { day: "", month: "" };
  return { day: match[1], month: match[2] };
}

const MAX_CHARS = 150;

const SCALE = 0.6;
const PREVIEW_W = Math.round(1080 * SCALE); // 648
const PREVIEW_H = Math.round(1350 * SCALE); // 810

// ── Colours (neutral dark / gold CTA / green accent) ──
const BG = "#0e0e0e";
const SURFACE = "#181818";
const BORDER = "rgba(255,255,255,0.08)";
const GOLD = "#f0b429";
const GREEN = "#22c55e";
const TEXT = "#f5f5f5";
const MUTED = "#9ca3af";

export default function SubmitPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: BG }}
        >
          <div style={{ color: MUTED, textAlign: "center" }}>
            <SpinnerLg />
            <p className="mt-4 font-semibold text-lg" style={{ color: MUTED }}>
              Loading your profile...
            </p>
          </div>
        </div>
      }
    >
      <SubmitPageInner />
    </Suspense>
  );
}

function SubmitPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAlreadySubmitted = searchParams.get("submitted") === "true";

  const [student, setStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [previewForm, setPreviewForm] = useState<FormState>(INITIAL_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [highlightField, setHighlightField] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormState | "photo", string>>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [showPreviewSheet, setShowPreviewSheet] = useState(false);
  const [pageReady, setPageReady] = useState(false);

  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const studentIdRef = useRef<string | null>(null);
  const hlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("fyb_session");
    if (!raw) {
      router.replace("/");
      return;
    }
    const session = JSON.parse(raw) as {
      student_id: string;
      matric_no: string;
    };
    studentIdRef.current = session.student_id;

    async function load() {
      const { data: sd } = await supabase
        .from("students")
        .select("*")
        .eq("id", session.student_id)
        .single();
      if (!sd) {
        router.replace("/");
        return;
      }
      setStudent(sd as Student);

      const { data: ad } = await supabase
        .from("fyb_answers")
        .select("*")
        .eq("student_id", session.student_id)
        .single();
      if (ad) {
        const { day: dobDay, month: dobMonth } = dobToParts(sd.dob || "");
        const saved: FormState = {
          nickname: sd.nickname || "",
          dob_day: dobDay,
          dob_month: dobMonth,
          state_of_origin: (sd as any).state_of_origin || "",
          relationship_status: ad.relationship_status || "",
          hobbies: ad.hobbies || "",
          favourite_course: ad.favourite_course || "",
          favourite_lecturer: ad.favourite_lecturer || "",
          most_challenging_level: ad.most_challenging_level || "",
          most_challenging_course: ad.most_challenging_course || "",
          best_level: ad.best_level || "",
          best_memory: ad.best_memory || "",
          advice_to_freshers: ad.advice_to_freshers || "",
          if_not_unn: (ad as any).if_not_unn || "",
          if_not_cs: (ad as any).if_not_cs || "",
          profession: (ad as any).profession || "",
          favourite_quote: ad.favourite_quote || "",
          fun_fact: ad.fun_fact || "",
          social_media_platform: (ad as any).social_media_platform || "",
          social_media_handle: ad.social_media_handle || "",
        };
        setForm(saved);
        setPreviewForm(saved);
      } else {
        const { day: dobDay, month: dobMonth } = dobToParts(sd.dob || "");
        const pre = {
          dob_day: dobDay,
          dob_month: dobMonth,
          state_of_origin: (sd as any).state_of_origin || "",
          nickname: sd.nickname || "",
        };
        setForm((f) => ({ ...f, ...pre }));
        setPreviewForm((f) => ({ ...f, ...pre }));
      }

      if (sd.photo_url) setPhotoPreviewUrl(sd.photo_url);
      setPageReady(true);
    }
    load();
  }, [router]);

  useEffect(() => {
    saveTimer.current = setInterval(() => {
      if (studentIdRef.current) saveAnswers(form);
    }, 30000);
    return () => {
      if (saveTimer.current) clearInterval(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const saveAnswers = useCallback(async (data: FormState) => {
    if (!studentIdRef.current) return;
    setSaveStatus("saving");
    const dobString = dobFromParts(data.dob_day, data.dob_month);
    await Promise.all([
      supabase
        .from("students")
        .update({
          nickname: data.nickname || null,
          dob: dobString || null,
          state_of_origin: data.state_of_origin || null,
        })
        .eq("id", studentIdRef.current),
      supabase.from("fyb_answers").upsert(
        {
          student_id: studentIdRef.current,
          relationship_status: data.relationship_status || null,
          hobbies: data.hobbies || null,
          favourite_course: data.favourite_course || null,
          favourite_lecturer: data.favourite_lecturer || null,
          most_challenging_level: data.most_challenging_level || null,
          most_challenging_course: data.most_challenging_course || null,
          best_level: data.best_level || null,
          best_memory: data.best_memory || null,
          advice_to_freshers: data.advice_to_freshers || null,
          if_not_unn: data.if_not_unn || null,
          if_not_cs: data.if_not_cs || null,
          profession: data.profession || null,
          favourite_quote: data.favourite_quote || null,
          fun_fact: data.fun_fact || null,
          social_media_platform: data.social_media_platform || null,
          social_media_handle: data.social_media_handle || null,
        },
        { onConflict: "student_id" },
      ),
    ]);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  }, []);

  function handleChange(field: keyof FormState, value: string) {
    const v = value.slice(0, MAX_CHARS);
    setForm((f) => ({ ...f, [field]: v }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
    clearTimeout(debounceTimers.current[field]);
    debounceTimers.current[field] = setTimeout(
      () => setPreviewForm((f) => ({ ...f, [field]: v })),
      150,
    );
  }

  function handleBlur(_field: keyof FormState) {
    setHighlightField(null);
    saveAnswers(form);
  }

  function handleFocus(field: string) {
    setHighlightField(field);
    if (hlTimer.current) clearTimeout(hlTimer.current);
    hlTimer.current = setTimeout(() => setHighlightField(null), 1000);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setErrors((err) => ({
        ...err,
        photo: "Only JPEG or PNG files are allowed.",
      }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((err) => ({ ...err, photo: "Photo must be under 5MB." }));
      return;
    }
    if (photoPreviewUrl?.startsWith("blob:"))
      URL.revokeObjectURL(photoPreviewUrl);
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
    setErrors((err) => ({ ...err, photo: "" }));
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    for (const f of REQUIRED_FIELDS)
      if (!form[f]?.trim()) errs[f] = "This field is required.";
    if (!photoPreviewUrl) errs.photo = "Please upload a profile photo.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !studentIdRef.current) return;
    setSubmitting(true);

    let uploadedPhotoUrl = student?.photo_url || null;
    if (photoFile) {
      const ext = photoFile.type === "image/png" ? "png" : "jpg";
      const { error: upErr } = await supabase.storage
        .from("profile-photos")
        .upload(`${studentIdRef.current}.${ext}`, photoFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(`${studentIdRef.current}.${ext}`);
        uploadedPhotoUrl = urlData.publicUrl;
        await supabase
          .from("students")
          .update({ photo_url: uploadedPhotoUrl })
          .eq("id", studentIdRef.current);
      }
    }

    await saveAnswers(form);
    const res = await fetch("/api/generate-flyer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentIdRef.current }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErrors({
        photo: body.error || "Submission failed. Please try again.",
      });
      setSubmitting(false);
      return;
    }
    router.push("/done");
  }

  if (!pageReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BG }}
      >
        <div className="text-center">
          <SpinnerLg />
          <p className="mt-4 font-semibold text-lg" style={{ color: MUTED }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  const studentPartial = student
    ? {
        ...student,
        nickname: form.nickname || student.nickname || undefined,
        dob: dobFromParts(form.dob_day, form.dob_month) || student.dob || undefined,
        state_of_origin: form.state_of_origin || student.state_of_origin || undefined,
      }
    : {};

  // ── Dummy data for preview — real photo is preserved ──
  const DUMMY_STUDENT: Partial<typeof studentPartial> = {
    full_name: "John Doe",
    course_of_study: "Computer Science",
    nickname: "The Phantom",
    dob: "1st January",
    state_of_origin: "Enugu",
    photo_url: null,
  };

  const DUMMY_ANSWERS = {
    hobbies: "Reading, coding, long walks",
    favourite_course: "COS 401",
    favourite_lecturer: "Dr. Sample",
    most_challenging_level: "400 Level",
    most_challenging_course: "COS 402",
    best_level: "200 Level",
    best_memory: "Coding marathon with friends at 2 am",
    advice_to_freshers: "Stay consistent, it pays off eventually.",
    favourite_quote: "Progress over perfection.",
    fun_fact: "Finished a 600-page novel in one sitting.",
    if_not_unn: "University of Lagos",
    if_not_cs: "Electrical Engineering",
    profession: "Software Engineer",
    social_media_handle: "@johndoe",
    social_media_platform: "Instagram",
    relationship_status: "Single and focused",
  };

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40"
        style={{
          background: "rgba(14,14,14,0.95)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="px-2.5 py-1 rounded-lg text-xs font-black tracking-widest"
              style={{ background: GOLD, color: "#0e0e0e" }}
            >
              FYB
            </div>
            <span className="font-bold text-sm" style={{ color: TEXT }}>
              {student?.full_name}
            </span>
            <span className="text-xs" style={{ color: MUTED }}>
              {student?.matric_no}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {saveStatus === "saving" && (
              <SaveIndicator color="#eab308" label="Saving..." />
            )}
            {saveStatus === "saved" && (
              <SaveIndicator color={GREEN} label="Saved" />
            )}
            {isAlreadySubmitted && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{
                  background: "rgba(234,179,8,0.12)",
                  border: "1px solid rgba(234,179,8,0.25)",
                  color: "#fde047",
                }}
              >
                Already submitted
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-8 items-start">
          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 min-w-0 space-y-8 pb-24"
          >
            <Section title="Personal Information">
              <ReadOnly label="Full Name" value={student?.full_name || ""} />
              <ReadOnly
                label="Course of Study"
                value={student?.course_of_study || ""}
              />
              <ReadOnly
                label="Matric Number"
                value={student?.matric_no || ""}
              />

              <Field label="Nickname / Alias" hint="Optional. Max 25 chars.">
                <DInput
                  value={form.nickname}
                  onChange={(v) => handleChange("nickname", v.slice(0, 25))}
                  onFocus={() => handleFocus("nickname")}
                  onBlur={() => handleBlur("nickname")}
                  placeholder='e.g. "The Genius"'
                />
              </Field>

              <Field label="Date of Birth" required>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <DSel
                      value={form.dob_day}
                      onChange={(v) => {
                        handleChange("dob_day", v);
                        setPreviewForm((f) => ({ ...f, dob_day: v }));
                      }}
                      onFocus={() => handleFocus("dob_day")}
                      onBlur={() => handleBlur("dob_day")}
                      error={!!errors.dob_day}
                    >
                      <option value="">Day</option>
                      {DAYS.map((d) => (
                        <option key={d.value} value={d.value}>{d.label}</option>
                      ))}
                    </DSel>
                    {errors.dob_day && <Err msg={errors.dob_day} />}
                  </div>
                  <div className="flex-1">
                    <DSel
                      value={form.dob_month}
                      onChange={(v) => {
                        handleChange("dob_month", v);
                        setPreviewForm((f) => ({ ...f, dob_month: v }));
                      }}
                      onFocus={() => handleFocus("dob_month")}
                      onBlur={() => handleBlur("dob_month")}
                      error={!!errors.dob_month}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </DSel>
                    {errors.dob_month && <Err msg={errors.dob_month} />}
                  </div>
                </div>
              </Field>

              <Field label="State of Origin" required>
                <DSel
                  value={form.state_of_origin}
                  onChange={(v) => {
                    handleChange("state_of_origin", v);
                    setPreviewForm((f) => ({ ...f, state_of_origin: v }));
                  }}
                  onFocus={() => handleFocus("state_of_origin")}
                  onBlur={() => handleBlur("state_of_origin")}
                  error={!!errors.state_of_origin}
                >
                  <option value="">Select state</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </DSel>
                {errors.state_of_origin && <Err msg={errors.state_of_origin} />}
              </Field>

              <Field label="Relationship Status" required>
                <DSel
                  value={form.relationship_status}
                  onChange={(v) => {
                    handleChange("relationship_status", v);
                    setPreviewForm((f) => ({ ...f, relationship_status: v }));
                  }}
                  onFocus={() => handleFocus("relationship_status")}
                  onBlur={() => handleBlur("relationship_status")}
                  error={!!errors.relationship_status}
                >
                  <option value="">Select status</option>
                  <option>Single</option>
                  <option>Taken</option>
                  <option>Complicated</option>
                  <option>Classified</option>
                </DSel>
                {errors.relationship_status && (
                  <Err msg={errors.relationship_status} />
                )}
              </Field>

              <Field label="Social Media" hint="Optional">
                <div className="flex gap-3">
                  <div style={{ flexBasis: "40%", flexShrink: 0 }}>
                    <DSel
                      value={form.social_media_platform}
                      onChange={(v) => {
                        handleChange("social_media_platform", v);
                        setPreviewForm((f) => ({ ...f, social_media_platform: v }));
                      }}
                      onFocus={() => handleFocus("social_media_platform")}
                      onBlur={() => handleBlur("social_media_platform")}
                    >
                      <option value="">Platform</option>
                      {SOCIAL_PLATFORMS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </DSel>
                  </div>
                  <div className="flex-1">
                    <DInput
                      value={form.social_media_handle}
                      onChange={(v) =>
                        handleChange("social_media_handle", v.slice(0, 30))
                      }
                      onFocus={() => handleFocus("social_media_handle")}
                      onBlur={() => handleBlur("social_media_handle")}
                      placeholder="@your_handle"
                    />
                  </div>
                </div>
              </Field>

              {/* Photo upload */}
              <Field label="Profile Photo" hint="JPEG or PNG, max 5MB" required>
                <div className="flex items-start gap-4">
                  {photoPreviewUrl && (
                    <div
                      className="w-20 h-24 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ border: `2px solid ${BORDER}` }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <label className="cursor-pointer flex-1">
                    <div
                      className="rounded-xl p-5 text-center"
                      style={{
                        border: `2px dashed ${errors.photo ? "rgba(239,68,68,0.4)" : BORDER}`,
                        background: errors.photo
                          ? "rgba(239,68,68,0.05)"
                          : "rgba(255,255,255,0.03)",
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{ color: MUTED }}
                      >
                        Click to upload photo
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: "rgba(255,255,255,0.2)" }}
                      >
                        JPEG or PNG &bull; Max 5MB
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                </div>
                {errors.photo && <Err msg={errors.photo} />}
              </Field>
            </Section>

            <Section title="FYB Answers" subtitle="Max 150 characters each.">
              <TA
                field="hobbies"
                label="Hobbies & Interests"
                required
                value={form.hobbies}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.hobbies}
              />
              <TA
                field="favourite_course"
                label="Favourite Course"
                required
                value={form.favourite_course}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.favourite_course}
              />
              <TA
                field="most_challenging_course"
                label="Most Challenging Course"
                required
                value={form.most_challenging_course}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.most_challenging_course}
                placeholder="e.g. MTH 301: Complex Analysis"
              />
              <TA
                field="if_not_cs"
                label="If Not Computer Science, What?"
                required
                value={form.if_not_cs}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.if_not_cs}
                placeholder="e.g. Medicine, Law..."
              />
              <TA
                field="favourite_lecturer"
                label="Favourite Lecturer"
                required={false}
                value={form.favourite_lecturer}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />

              <Field label="Most Challenging Level" required>
                <DSel
                  value={form.most_challenging_level}
                  onChange={(v) => {
                    handleChange("most_challenging_level", v);
                    setPreviewForm((f) => ({ ...f, most_challenging_level: v }));
                  }}
                  onFocus={() => handleFocus("most_challenging_level")}
                  onBlur={() => handleBlur("most_challenging_level")}
                  error={!!errors.most_challenging_level}
                >
                  <option value="">Select level</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </DSel>
                {errors.most_challenging_level && <Err msg={errors.most_challenging_level} />}
              </Field>

              <Field label="Best Level" required>
                <DSel
                  value={form.best_level}
                  onChange={(v) => {
                    handleChange("best_level", v);
                    setPreviewForm((f) => ({ ...f, best_level: v }));
                  }}
                  onFocus={() => handleFocus("best_level")}
                  onBlur={() => handleBlur("best_level")}
                  error={!!errors.best_level}
                >
                  <option value="">Select level</option>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </DSel>
                {errors.best_level && <Err msg={errors.best_level} />}
              </Field>

              <TA
                field="if_not_unn"
                label="If Not UNN, Where?"
                required
                value={form.if_not_unn}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.if_not_unn}
                placeholder="e.g. UNILAG, ABU..."
              />
              <TA
                field="best_memory"
                label="Best Campus Memory"
                required
                value={form.best_memory}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.best_memory}
              />
              <TA
                field="advice_to_freshers"
                label="Advice to 100L Students"
                required
                value={form.advice_to_freshers}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.advice_to_freshers}
              />
              <TA
                field="profession"
                label="Aspiring / Current Profession"
                required
                value={form.profession}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                error={errors.profession}
                placeholder="e.g. Software Engineer, Entrepreneur..."
              />
              <TA
                field="favourite_quote"
                label="Favourite Quote"
                required={false}
                value={form.favourite_quote}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
              <TA
                field="fun_fact"
                label="Fun Fact About You"
                required={false}
                value={form.fun_fact}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
              />
            </Section>

            {/* Submit */}
            <div className="pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all disabled:opacity-50"
                style={{
                  background: submitting ? "rgba(240,180,41,0.4)" : GOLD,
                  color: "#0e0e0e",
                }}
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <SpinnerSm dark /> Generating your flyer...
                  </span>
                ) : (
                  "Submit My Flyer"
                )}
              </button>
              <p
                className="text-center text-xs mt-3"
                style={{ color: "rgba(255,255,255,0.2)" }}
              >
                Once submitted, the committee will post your flyer.
              </p>
            </div>
          </form>

          {/* Desktop flyer preview */}
          <div
            className="hidden lg:block flex-shrink-0 sticky top-20"
            style={{ width: PREVIEW_W }}
          >
            <p
              className="text-center text-xs mb-2 font-semibold uppercase tracking-widest"
              style={{ color: MUTED }}
            >
              Sample Layout
            </p>
            <p
              className="text-center text-xs mb-3 leading-relaxed px-2"
              style={{ color: "rgba(232,168,32,0.7)" }}
            >
              Your name and answers are replaced with dummy data to protect your privacy. Your submitted flyer will show your real information.
            </p>
            <div
              className="flyer-preview-panel"
              style={{
                width: PREVIEW_W,
                height: PREVIEW_H,
                overflow: "hidden",
                borderRadius: 12,
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                userSelect: "none",
                pointerEvents: "none",
                border: `1px solid ${BORDER}`,
              }}
            >
              <div
                style={{
                  transform: `scale(${SCALE})`,
                  transformOrigin: "top left",
                  width: 1080,
                  height: 1350,
                }}
              >
                <FlyerTemplate
                  student={DUMMY_STUDENT}
                  answers={DUMMY_ANSWERS as Partial<FybAnswers>}
                  showWatermark
                  highlightField={null}
                  photoUrl={photoPreviewUrl}
                />
              </div>
            </div>
            <p
              className="text-center text-xs mt-2 italic"
              style={{ color: "rgba(255,255,255,0.18)" }}
            >
              Photo updates as you upload
            </p>
          </div>
        </div>
      </div>

      {/* Mobile preview button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setShowPreviewSheet(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm shadow-xl"
          style={{ background: GOLD, color: "#0e0e0e" }}
        >
          See Preview
        </button>
      </div>

      {/* Mobile bottom sheet */}
      {showPreviewSheet && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setShowPreviewSheet(false)}
          />
          <div
            className="relative w-full rounded-t-3xl pt-4 pb-8 px-4 max-h-[92vh] overflow-y-auto"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold" style={{ color: TEXT }}>
                Sample Layout
              </span>
              <button
                onClick={() => setShowPreviewSheet(false)}
                className="text-2xl leading-none"
                style={{ color: MUTED }}
              >
                &times;
              </button>
            </div>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "rgba(232,168,32,0.7)" }}>
              Your name and answers are replaced with dummy data to protect your privacy. Your submitted flyer will show your real information.
            </p>
            <div className="flex justify-center">
              <div
                style={{
                  width: Math.round(1080 * 0.55),
                  height: Math.round(1350 * 0.55),
                  overflow: "hidden",
                  borderRadius: 10,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    transform: "scale(0.55)",
                    transformOrigin: "top left",
                    width: 1080,
                    height: 1350,
                  }}
                >
                  <FlyerTemplate
                    student={DUMMY_STUDENT}
                    answers={DUMMY_ANSWERS as Partial<FybAnswers>}
                    showWatermark
                    highlightField={null}
                    photoUrl={photoPreviewUrl}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small re-usable sub-components ──

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        className="mb-4 pb-2"
        style={{ borderBottom: `1px solid ${BORDER}` }}
      >
        <h2 className="font-bold text-lg" style={{ color: TEXT }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: MUTED }}>
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label
        className="block text-sm font-medium mb-1"
        style={{ color: MUTED }}
      >
        {label}
      </label>
      <div
        className="px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${BORDER}`,
          color: "rgba(245,245,245,0.35)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-sm font-semibold mb-1.5"
        style={{ color: TEXT }}
      >
        {label}
        {required && (
          <span className="ml-1" style={{ color: GOLD }}>
            *
          </span>
        )}
        {hint && (
          <span className="font-normal ml-2 text-xs" style={{ color: MUTED }}>
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function DInput({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none transition-colors"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1.5px solid ${error ? "rgba(239,68,68,0.5)" : BORDER}`,
        color: TEXT,
      }}
    />
  );
}

function DSel({
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none"
      style={{
        background: SURFACE,
        border: `1.5px solid ${error ? "rgba(239,68,68,0.5)" : BORDER}`,
        color: value ? TEXT : "rgba(245,245,245,0.3)",
      }}
    >
      {children}
    </select>
  );
}

function TA({
  field,
  label,
  required,
  value,
  onChange,
  onFocus,
  onBlur,
  error,
  placeholder,
}: {
  field: keyof FormState;
  label: string;
  required: boolean;
  value: string;
  onChange: (f: keyof FormState, v: string) => void;
  onFocus: (f: string) => void;
  onBlur: (f: keyof FormState) => void;
  error?: string;
  placeholder?: string;
}) {
  const safeValue = value ?? "";
  return (
    <Field label={label} required={required}>
      <textarea
        value={safeValue}
        onChange={(e) => onChange(field, e.target.value)}
        onFocus={() => onFocus(field)}
        onBlur={() => onBlur(field)}
        placeholder={placeholder || "Your answer here..."}
        rows={2}
        maxLength={MAX_CHARS}
        className="w-full px-4 py-3 rounded-xl text-sm font-medium focus:outline-none resize-none"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1.5px solid ${error ? "rgba(239,68,68,0.5)" : BORDER}`,
          color: TEXT,
        }}
      />
      <div className="flex justify-between mt-1">
        {error ? <Err msg={error} /> : <span />}
        <span
          className="text-xs"
          style={{
            color:
              safeValue.length >= MAX_CHARS ? "#f87171" : "rgba(255,255,255,0.2)",
          }}
        >
          {safeValue.length}/{MAX_CHARS}
        </span>
      </div>
    </Field>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <p className="text-xs font-medium mt-1" style={{ color: "#f87171" }}>
      {msg}
    </p>
  );
}

function SaveIndicator({ color, label }: { color: string; label: string }) {
  return (
    <span className="text-xs flex items-center gap-1.5" style={{ color }}>
      <span
        className="w-2 h-2 rounded-full inline-block"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

function SpinnerLg() {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        border: "3px solid rgba(255,255,255,0.1)",
        borderTopColor: GOLD,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        margin: "0 auto",
      }}
    />
  );
}

function SpinnerSm({ dark }: { dark?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 18,
        height: 18,
        border: `2px solid ${dark ? "rgba(14,14,14,0.25)" : "rgba(245,245,245,0.25)"}`,
        borderTopColor: dark ? "#0e0e0e" : TEXT,
        borderRadius: "50%",
        animation: "spin 0.7s linear infinite",
      }}
    />
  );
}
