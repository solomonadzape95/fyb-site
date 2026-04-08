-- FYB '25 Database Schema
-- Run this in the Supabase SQL Editor before building.
-- Buckets (profile-photos public, flyer-exports private) are created separately in the Storage tab.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matric_no text UNIQUE NOT NULL,
  full_name text NOT NULL,
  course_of_study text NOT NULL,
  nickname text,
  dob text,
  gender text,
  state_of_origin text,
  photo_url text,
  has_submitted boolean DEFAULT false,
  is_locked boolean DEFAULT false,
  dispatched_at timestamptz,
  submitted_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS fyb_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE UNIQUE NOT NULL,
  relationship_status text,
  hobbies text,
  favourite_course text,
  favourite_lecturer text,
  most_challenging_level text,
  most_challenging_course text,
  best_level text,
  best_memory text,
  advice_to_freshers text,
  what_next_after_school text,
  favourite_quote text,
  fun_fact text,
  shoutouts text,
  social_media_handle text,
  social_media_platform text,
  if_not_unn text,
  if_not_cs text,
  profession text,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- MIGRATION: run these if tables already exist (safe to re-run)
-- ============================================================
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS state_of_origin text;
-- ALTER TABLE students ADD COLUMN IF NOT EXISTS dispatched_at timestamptz;
-- ALTER TABLE fyb_answers ADD COLUMN IF NOT EXISTS social_media_platform text;
-- ALTER TABLE fyb_answers ADD COLUMN IF NOT EXISTS if_not_unn text;
-- ALTER TABLE fyb_answers ADD COLUMN IF NOT EXISTS if_not_cs text;
-- ALTER TABLE fyb_answers ADD COLUMN IF NOT EXISTS profession text;

CREATE TABLE IF NOT EXISTS flyer_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE UNIQUE NOT NULL,
  flyer_path text NOT NULL,
  generated_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE fyb_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE flyer_exports ENABLE ROW LEVEL SECURITY;

-- Students: public read (needed for matric lookup), no public write
CREATE POLICY "Public can read students" ON students
  FOR SELECT USING (deleted_at IS NULL);

-- fyb_answers: anon users can read/write their own answers
-- Access is filtered by student_id in application code
-- (non-sensitive profile data — acceptable per product spec)
CREATE POLICY "Anon can manage fyb_answers" ON fyb_answers
  FOR ALL USING (true) WITH CHECK (true);

-- flyer_exports: no public access — admin uses service role key which bypasses RLS
CREATE POLICY "No public access to flyer_exports" ON flyer_exports
  FOR ALL USING (false);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS students_matric_no_idx ON students(matric_no);
CREATE INDEX IF NOT EXISTS students_has_submitted_idx ON students(has_submitted);
CREATE INDEX IF NOT EXISTS fyb_answers_student_id_idx ON fyb_answers(student_id);
CREATE INDEX IF NOT EXISTS flyer_exports_student_id_idx ON flyer_exports(student_id);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER fyb_answers_updated_at
  BEFORE UPDATE ON fyb_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
