-- Run once in Supabase → SQL Editor (after fix-profiles-rls.sql and student-portal-setup.sql)
-- Same as attendance-taking-app/supabase/messages-setup.sql

create or replace function public.teacher_teaches_student(p_teacher_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teacher_subjects ts
    join public.student_subjects ss on ss.subject_id = ts.subject_id
    where ts.teacher_id = p_teacher_id
      and ss.student_id = p_student_id
  );
$$;

create or replace function public.can_message(p_sender uuid, p_recipient uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s_role text;
  r_role text;
  s_student_id uuid;
  r_student_id uuid;
begin
  if p_sender = p_recipient then
    return false;
  end if;

  select role, student_id into s_role, s_student_id
  from public.profiles where id = p_sender;

  select role, student_id into r_role, r_student_id
  from public.profiles where id = p_recipient;

  if s_role is null or r_role is null then
    return false;
  end if;

  if s_role = 'admin' and r_role = 'teacher' then return true; end if;
  if s_role = 'teacher' and r_role = 'admin' then return true; end if;

  if s_role = 'student' and r_role = 'teacher' then
    return public.teacher_teaches_student(p_recipient, s_student_id);
  end if;

  if s_role = 'teacher' and r_role = 'student' then
    return public.teacher_teaches_student(p_sender, r_student_id);
  end if;

  return false;
end;
$$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_participants_created_idx
  on public.messages (sender_id, recipient_id, created_at desc);

create index if not exists messages_recipient_unread_idx
  on public.messages (recipient_id, read_at)
  where read_at is null;

alter table public.messages enable row level security;

drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
  on public.messages for select
  to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.can_message(auth.uid(), recipient_id)
  );

drop policy if exists "messages_update_read" on public.messages;
create policy "messages_update_read"
  on public.messages for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
