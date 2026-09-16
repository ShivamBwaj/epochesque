-- ============================================================
-- 0038 — global switch for making project pages public. Same
-- pattern as certificates_published: admin-only until the admin
-- flips this, then every team's project page (and the info on it)
-- becomes publicly reachable at /projects/[teamCode].
-- ============================================================

begin;

insert into public.event_settings (key, value) values ('projects_published', 'false'::jsonb)
on conflict (key) do nothing;

commit;
