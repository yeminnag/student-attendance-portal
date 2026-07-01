-- Run once in Supabase → SQL Editor (after messages-setup.sql and student-portal-setup.sql)
-- Same as attendance-taking-app/supabase/messages-contacts-rls.sql

drop policy if exists "teacher_subjects_select_enrolled" on public.teacher_subjects;
create policy "teacher_subjects_select_enrolled"
  on public.teacher_subjects for select
  to authenticated
  using (
    public.is_student()
    and public.student_enrolled_in_subject(subject_id)
  );

drop policy if exists "profiles_select_messaging" on public.profiles;
create policy "profiles_select_messaging"
  on public.profiles for select
  to authenticated
  using (
    public.can_message(auth.uid(), id)
    or public.can_message(id, auth.uid())
  );
