export interface Student {
  id: string;
  matric_no: string;
  full_name: string;
  course_of_study: string;
  nickname?: string | null;
  dob?: string | null;
  gender?: string | null;
  state_of_origin?: string | null;
  photo_url?: string | null;
  has_submitted: boolean;
  is_locked: boolean;
  dispatched_at?: string | null;
  submitted_at?: string | null;
  updated_at: string;
  deleted_at?: string | null;
}

export interface FybAnswers {
  id: string;
  student_id: string;
  relationship_status?: string | null;
  hobbies?: string | null;
  favourite_course?: string | null;
  favourite_lecturer?: string | null;
  most_challenging_level?: string | null;
  most_challenging_course?: string | null;
  best_level?: string | null;
  best_memory?: string | null;
  advice_to_freshers?: string | null;
  what_next_after_school?: string | null;
  favourite_quote?: string | null;
  fun_fact?: string | null;
  shoutouts?: string | null;
  social_media_handle?: string | null;
  social_media_platform?: string | null;
  if_not_unn?: string | null;
  if_not_cs?: string | null;
  profession?: string | null;
  updated_at: string;
}

export interface FlyerExport {
  id: string;
  student_id: string;
  flyer_path: string;
  generated_at: string;
}

export interface AdminSession {
  authenticated: boolean;
}

export interface FlyerData {
  student: Student;
  answers: Partial<FybAnswers>;
  photoUrl?: string | null;
}

export interface StudentWithAnswers extends Student {
  fyb_answers?: Partial<FybAnswers> | null;
  flyer_exports?: FlyerExport | null;
}
