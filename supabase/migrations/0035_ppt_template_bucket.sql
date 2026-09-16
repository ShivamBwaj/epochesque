-- ============================================================
-- 0035 — public-read storage bucket for the pitch-deck template
-- admins hand out on the OC Round submission page. Admin can
-- replace it any time from /admin/settings; participants only
-- ever read it.
-- ============================================================

begin;

insert into storage.buckets (id, name, public) values ('templates', 'templates', true)
on conflict (id) do nothing;

drop policy if exists "templates_public_read" on storage.objects;
create policy "templates_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'templates');

insert into public.event_settings (key, value) values ('ppt_template_path', '""'::jsonb)
on conflict (key) do nothing;

commit;
