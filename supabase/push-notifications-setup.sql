-- Run once in Supabase → SQL Editor (after student-portal-setup.sql)
-- Web push subscriptions + morning notification log

create table if not exists public.student_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  morning_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (student_id, endpoint)
);

create index if not exists student_push_subscriptions_student_id_idx
  on public.student_push_subscriptions (student_id);

create table if not exists public.student_notification_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  notification_type text not null,
  sent_date date not null,
  created_at timestamptz not null default now(),
  unique (student_id, notification_type, sent_date)
);

alter table public.student_push_subscriptions enable row level security;
alter table public.student_notification_logs enable row level security;

drop policy if exists "student_push_subscriptions_select" on public.student_push_subscriptions;
create policy "student_push_subscriptions_select"
  on public.student_push_subscriptions for select
  to authenticated
  using (
    public.is_staff()
    or student_id = public.current_student_id()
  );

drop policy if exists "student_push_subscriptions_insert" on public.student_push_subscriptions;
create policy "student_push_subscriptions_insert"
  on public.student_push_subscriptions for insert
  to authenticated
  with check (student_id = public.current_student_id());

drop policy if exists "student_push_subscriptions_update" on public.student_push_subscriptions;
create policy "student_push_subscriptions_update"
  on public.student_push_subscriptions for update
  to authenticated
  using (student_id = public.current_student_id())
  with check (student_id = public.current_student_id());

drop policy if exists "student_push_subscriptions_delete" on public.student_push_subscriptions;
create policy "student_push_subscriptions_delete"
  on public.student_push_subscriptions for delete
  to authenticated
  using (student_id = public.current_student_id());

drop policy if exists "student_notification_logs_select" on public.student_notification_logs;
create policy "student_notification_logs_select"
  on public.student_notification_logs for select
  to authenticated
  using (student_id = public.current_student_id());
