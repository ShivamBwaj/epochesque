-- ============================================================
-- 0036 — final-round project pages (devfolio-style).
-- Adds project_title/project_description to submissions (the repo
-- URL already lives in `url`). A public view exposes only teams
-- that filled in a title — never raw team internals — so each
-- team gets a shareable project page independent of whether judging
-- has published anything. The (admin-only) leaderboard links to it.
-- ============================================================

begin;

alter table public.submissions add column project_title text;
alter table public.submissions add column project_description text;

create or replace view public.project_pages_public
with (security_invoker = false) as
select t.team_code, t.team_name, s.project_title, s.project_description, s.url as repo_url, s.submitted_at
from public.submissions s
join public.teams t on t.id = s.team_id
where s.round = 'final' and s.project_title is not null and trim(s.project_title) <> '';

grant select on public.project_pages_public to anon, authenticated;

commit;
