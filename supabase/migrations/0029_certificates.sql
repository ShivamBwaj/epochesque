-- 0029 — Certificates: a private storage bucket holding the (single)
-- template image, plus a settings flag for when participants can download
-- their own. Generated PDFs are never stored — built on demand per request
-- from the template + the person's name, so this bucket only ever holds
-- the template asset. Service-role only, same posture as `submissions`.
begin;

insert into storage.buckets (id, name, public) values ('certificates', 'certificates', false)
on conflict (id) do nothing;

insert into public.event_settings (key, value) values ('certificates_published', 'false'::jsonb)
on conflict (key) do nothing;

commit;
