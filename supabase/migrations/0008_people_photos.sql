-- 0008: person photos — photo_path column + public 'people' storage bucket
begin;

alter table public.people add column if not exists photo_path text;

insert into storage.buckets (id, name, public) values ('people', 'people', true)
on conflict (id) do nothing;

drop policy if exists "people_public_read" on storage.objects;
create policy "people_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'people');

commit;
