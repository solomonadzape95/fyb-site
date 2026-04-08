import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase';
import { Student, FybAnswers } from '@/types/student';
import AdminStudentClient from './client';

export default async function AdminStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = createServerClient();

  const { data: student, error } = await db
    .from('students')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !student) {
    return notFound();
  }

  const { data: answers } = await db
    .from('fyb_answers')
    .select('*')
    .eq('student_id', id)
    .single();

  const { data: flyerExport } = await db
    .from('flyer_exports')
    .select('*')
    .eq('student_id', id)
    .single();

  return (
    <AdminStudentClient
      student={student as Student}
      answers={(answers as Partial<FybAnswers>) || {}}
      hasFlyer={!!flyerExport}
    />
  );
}
