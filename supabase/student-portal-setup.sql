-- Run once in Supabase → SQL Editor (after fix-profiles-rls.sql)
-- Adds student role, links profiles to students, and tightens RLS so students
-- only see their own attendance data.

-- ---------------------------------------------------------------------------
-- 1. Schema: link auth profile → students row
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists student_id uuid references public.students(id) on delete set null;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role = any (array['admin'::text, 'teacher'::text, 'student'::text]));

create index if not exists profiles_student_id_idx
  on public.profiles (student_id)
  where student_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'teacher')
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'student'
  );
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select student_id
  from public.profiles
  where id = auth.uid()
    and role = 'student';
$$;

create or replace function public.student_enrolled_in_subject(p_subject_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.student_subjects
    where student_id = public.current_student_id()
      and subject_id = p_subject_id
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. Profile trigger: support student signup metadata
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student_id uuid;
begin
  v_student_id := nullif(new.raw_user_meta_data->>'student_id', '')::uuid;

  insert into public.profiles (id, email, name, role, username, student_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    new.raw_user_meta_data->>'username',
    v_student_id
  )
  on conflict (id) do update
    set email = excluded.email,
        name = excluded.name,
        role = excluded.role,
        username = excluded.username,
        student_id = coalesce(excluded.student_id, public.profiles.student_id);

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Replace SELECT policies (students must not inherit teacher-wide access)
-- ---------------------------------------------------------------------------

drop policy if exists "subjects_select" on public.subjects;
create policy "subjects_select"
  on public.subjects for select
  to authenticated
  using (
    public.is_staff()
    or (public.is_student() and public.student_enrolled_in_subject(id))
  );

drop policy if exists "students_select" on public.students;
create policy "students_select"
  on public.students for select
  to authenticated
  using (
    public.is_staff()
    or (public.is_student() and id = public.current_student_id())
  );

drop policy if exists "student_subjects_select" on public.student_subjects;
create policy "student_subjects_select"
  on public.student_subjects for select
  to authenticated
  using (
    public.is_staff()
    or (public.is_student() and student_id = public.current_student_id())
  );

drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select"
  on public.attendance for select
  to authenticated
  using (
    public.is_staff()
    or (public.is_student() and student_id = public.current_student_id())
  );

drop policy if exists "class_sessions_select" on public.class_sessions;
create policy "class_sessions_select"
  on public.class_sessions for select
  to authenticated
  using (
    public.is_staff()
    or (public.is_student() and public.student_enrolled_in_subject(subject_id))
  );

-- ---------------------------------------------------------------------------
-- 5. Student login accounts
-- ---------------------------------------------------------------------------
-- Admins create student logins from the teacher app:
--   学生管理 → 学生を追加 → 学籍番号 + パスワードを設定
-- Auth email is {学籍番号}@students.internal (same pattern as teachers).
