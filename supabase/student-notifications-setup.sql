-- Run once in Supabase → SQL Editor (after push-notifications-setup.sql)
-- In-app notification inbox for students (risk alerts, morning schedule, etc.)

create table if not exists public.student_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  sender_name text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists student_notifications_student_created_idx
  on public.student_notifications (student_id, created_at desc);

create index if not exists student_notifications_unread_idx
  on public.student_notifications (student_id)
  where read_at is null;

alter table public.student_notifications enable row level security;

drop policy if exists "student_notifications_select" on public.student_notifications;
create policy "student_notifications_select"
  on public.student_notifications for select
  to authenticated
  using (student_id = public.current_student_id());

drop policy if exists "student_notifications_update" on public.student_notifications;
create policy "student_notifications_update"
  on public.student_notifications for update
  to authenticated
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());
