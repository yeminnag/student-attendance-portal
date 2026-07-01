-- Run once in Supabase → SQL Editor if student-tracking-setup.sql was applied.
-- Removes push subscriptions, location logs, and tracking consent.

drop policy if exists "student_push_subscriptions_select" on public.student_push_subscriptions;
drop policy if exists "student_push_subscriptions_insert" on public.student_push_subscriptions;
drop policy if exists "student_push_subscriptions_update" on public.student_push_subscriptions;
drop policy if exists "student_push_subscriptions_delete" on public.student_push_subscriptions;

drop policy if exists "student_location_logs_select" on public.student_location_logs;
drop policy if exists "student_location_logs_insert" on public.student_location_logs;
drop policy if exists "student_location_logs_select_teacher" on public.student_location_logs;

drop policy if exists "profiles_update_student_consent" on public.profiles;

drop table if exists public.student_push_subscriptions;
drop table if exists public.student_location_logs;

alter table public.profiles
  drop column if exists tracking_consent_at;
