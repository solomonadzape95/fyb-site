import type { PosterData } from "@/components/PosterTemplate";

// Normalize a column header for matching: lowercase, collapse whitespace,
// strip punctuation. "If not Computer Science, where else?" → "if not computer science where else"
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Each target field has a list of accepted header forms (normalized).
const FIELD_ALIASES: Record<keyof PosterData | "best_course" | "worst_course", string[]> = {
  full_name: ["full name", "name"],
  dob: ["d o b", "dob", "date of birth"],
  socials: ["social media handles", "socials", "social media handle"],
  nickname: ["nickname"],
  hobbies: ["hobbies"],
  state_of_origin: ["state of origin", "state"],
  tech_skill: ["tech skill", "tech skills"],
  relationship_status: ["relationship status"],
  cs_or_stats: [
    "computer science statistics",
    "computer science or statistics",
    "cs or statistics",
    "computer science statistics ",
  ],
  if_not_cs: [
    "if not computer science where else",
    "if not cs where else",
    "if not cs",
  ],
  if_not_unn: ["if not unn where else", "if not unn"],
  department_buddies: [
    "closest friend s in the department",
    "closest friends in the department",
    "department buddies",
    "closest friend in the department",
  ],
  best_course: ["best course"],
  worst_course: ["worst course"],
  class_crush: ["class crush"],
  photo_url: ["picture of yourself", "picture", "photo", "photo url"],
};

function pick(row: Record<string, string>, normalized: Record<string, string>, aliases: string[]) {
  for (const alias of aliases) {
    const key = normalized[alias];
    if (key !== undefined) {
      const val = row[key];
      if (typeof val === "string" && val.trim()) return val.trim();
    }
  }
  return "";
}

export function mapRow(row: Record<string, string>): PosterData {
  // Build a lookup: normalized header → original key
  const normalized: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    normalized[norm(key)] = key;
  }

  return {
    full_name: pick(row, normalized, FIELD_ALIASES.full_name),
    dob: pick(row, normalized, FIELD_ALIASES.dob),
    socials: pick(row, normalized, FIELD_ALIASES.socials),
    nickname: pick(row, normalized, FIELD_ALIASES.nickname),
    hobbies: pick(row, normalized, FIELD_ALIASES.hobbies),
    state_of_origin: pick(row, normalized, FIELD_ALIASES.state_of_origin),
    tech_skill: pick(row, normalized, FIELD_ALIASES.tech_skill),
    relationship_status: pick(row, normalized, FIELD_ALIASES.relationship_status),
    cs_or_stats: pick(row, normalized, FIELD_ALIASES.cs_or_stats),
    if_not_cs: pick(row, normalized, FIELD_ALIASES.if_not_cs),
    if_not_unn: pick(row, normalized, FIELD_ALIASES.if_not_unn),
    department_buddies: pick(row, normalized, FIELD_ALIASES.department_buddies),
    best_course: pick(row, normalized, FIELD_ALIASES.best_course),
    worst_course: pick(row, normalized, FIELD_ALIASES.worst_course),
    class_crush: pick(row, normalized, FIELD_ALIASES.class_crush),
    photo_url: pick(row, normalized, FIELD_ALIASES.photo_url),
  };
}
