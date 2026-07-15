-- Run once in Supabase → SQL Editor
-- Restrict student UPDATE policies so only read_at can change on inbox tables.

create or replace function public.enforce_read_at_only_update()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'student_notifications' then
    if new.student_id is distinct from old.student_id
      or new.notification_type is distinct from old.notification_type
      or new.title is distinct from old.title
      or new.body is distinct from old.body
      or new.sender_name is distinct from old.sender_name
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only read_at can be updated on student_notifications';
    end if;
  elsif tg_table_name = 'messages' then
    if new.sender_id is distinct from old.sender_id
      or new.recipient_id is distinct from old.recipient_id
      or new.body is distinct from old.body
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Only read_at can be updated on messages';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists student_notifications_read_at_only on public.student_notifications;
create trigger student_notifications_read_at_only
  before update on public.student_notifications
  for each row
  execute function public.enforce_read_at_only_update();

drop trigger if exists messages_read_at_only on public.messages;
create trigger messages_read_at_only
  before update on public.messages
  for each row
  execute function public.enforce_read_at_only_update();
