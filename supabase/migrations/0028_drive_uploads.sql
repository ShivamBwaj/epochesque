-- 0028 — Google Drive backing for Round 1 deck uploads (instead of
-- Supabase Storage, to keep the DB/storage bill down). `drive_folder_id`
-- is cached on the team row so we create it in Drive at most once per team.
begin;

alter table public.teams add column drive_folder_id text;
alter table public.submissions add column drive_file_id text;
alter table public.submissions add column drive_view_link text;

commit;
