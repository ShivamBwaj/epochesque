-- ============================================================
-- EPOCH — initial schema + security lockdown
-- Applied via direct postgres connection (scripts/apply-migration.mjs)
-- Security model:
--   * RLS enabled on EVERY public table
--   * Teams can only SELECT their own rows (no direct writes)
--   * scores / leaderboard_visibility / announcements / admins have
--     NO anon/authenticated grants or policies -> unreachable via API
--   * ALL mutations go through service-role server actions, except
--     roll_problem_statement() (SECURITY DEFINER, atomic claim)
--   * Public leaderboard data exposed ONLY via views that check
--     is_published (views owned by postgres -> bypass underlying RLS)
--   * Storage: 'submissions' bucket private (no policies),
--     'gallery' bucket public-read
-- ============================================================

begin;

-- ============ TABLES ============

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  team_code text not null unique,
  team_name text not null,
  members jsonb not null default '[]'::jsonb,
  leader_email text not null,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  status text not null default 'registered'
    check (status in ('registered','round1','advanced','finalist','eliminated')),
  problem_statement_id int,
  ps_locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.problem_statements (
  id int generated always as identity primary key,
  code text not null unique,
  title text not null,
  description text not null default '',
  max_teams int not null default 1 check (max_teams >= 1),
  taken_count int not null default 0 check (taken_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.teams
  add constraint teams_ps_fk foreign key (problem_statement_id)
  references public.problem_statements(id) on delete set null;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  round text not null check (round in ('round1','final')),
  type text not null check (type in ('ppt','github')),
  url text,
  storage_path text,
  file_name text,
  file_size bigint,
  submitted_at timestamptz not null default now(),
  unique (team_id, round)
);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  round text not null check (round in ('round1','final')),
  total_score numeric(6,2) not null check (total_score >= 0),
  notes text not null default '',
  entered_at timestamptz not null default now(),
  unique (team_id, round)
);

create table public.leaderboard_visibility (
  round text primary key check (round in ('round1','final')),
  is_published boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'winners' check (kind in ('winners','notice')),
  title text not null default '',
  body jsonb not null default '[]'::jsonb,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

create table public.event_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ============ updated_at trigger ============

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_teams_touch before update on public.teams
  for each row execute function public.touch_updated_at();
create trigger trg_ps_touch before update on public.problem_statements
  for each row execute function public.touch_updated_at();
create trigger trg_ann_touch before update on public.announcements
  for each row execute function public.touch_updated_at();
create trigger trg_lv_touch before update on public.leaderboard_visibility
  for each row execute function public.touch_updated_at();
create trigger trg_es_touch before update on public.event_settings
  for each row execute function public.touch_updated_at();

-- ============ SEED ============

insert into public.leaderboard_visibility (round, is_published)
values ('round1', false), ('final', false)
on conflict (round) do nothing;

insert into public.event_settings (key, value) values
  ('event_start', 'null'::jsonb),
  ('ps_release_at', 'null'::jsonb),
  ('round1_deadline', 'null'::jsonb),
  ('final_deadline', 'null'::jsonb),
  ('event_end', 'null'::jsonb)
on conflict (key) do nothing;

-- ============ RLS: enable on everything ============

alter table public.teams enable row level security;
alter table public.problem_statements enable row level security;
alter table public.submissions enable row level security;
alter table public.scores enable row level security;
alter table public.leaderboard_visibility enable row level security;
alter table public.announcements enable row level security;
alter table public.admins enable row level security;
alter table public.event_settings enable row level security;
alter table public.gallery_photos enable row level security;

-- ============ RLS POLICIES (minimal, read-only for users) ============
-- NOTE: scores / leaderboard_visibility / announcements / admins get
-- deliberately NO policies and NO grants -> invisible to anon+authenticated.

-- A team can read ONLY its own row
create policy "teams_select_own" on public.teams
  for select to authenticated
  using (auth_user_id = auth.uid());

-- A team can read ONLY its assigned problem statement
create policy "ps_select_assigned" on public.problem_statements
  for select to authenticated
  using (
    id = (
      select t.problem_statement_id from public.teams t
      where t.auth_user_id = auth.uid()
    )
  );

-- A team can read ONLY its own submissions
create policy "submissions_select_own" on public.submissions
  for select to authenticated
  using (
    team_id = (select t.id from public.teams t where t.auth_user_id = auth.uid())
  );

-- Event timing + gallery are public info
create policy "settings_select_all" on public.event_settings
  for select to anon, authenticated using (true);
create policy "gallery_select_all" on public.gallery_photos
  for select to anon, authenticated using (true);

-- ============ STORAGE ============

insert into storage.buckets (id, name, public) values
  ('submissions', 'submissions', false),
  ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- Gallery: public read
drop policy if exists "gallery_public_read" on storage.objects;
create policy "gallery_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');
-- 'submissions' bucket: NO policies -> private, service-role only

-- ============ PUBLIC VIEWS (owner-privilege, publish-gated) ============

create or replace view public.leaderboard_round1_public
with (security_invoker = false) as
select rank() over (order by s.total_score desc) as rank,
       s.team_id, t.team_code, t.team_name, s.total_score, s.notes
from public.scores s
join public.teams t on t.id = s.team_id
where s.round = 'round1'
  and exists (
    select 1 from public.leaderboard_visibility lv
    where lv.round = 'round1' and lv.is_published
  );

create or replace view public.leaderboard_final_public
with (security_invoker = false) as
select rank() over (order by s.total_score desc) as rank,
       s.team_id, t.team_code, t.team_name, s.total_score, s.notes
from public.scores s
join public.teams t on t.id = s.team_id
where s.round = 'final'
  and exists (
    select 1 from public.leaderboard_visibility lv
    where lv.round = 'final' and lv.is_published
  );

create or replace view public.winners_public
with (security_invoker = false) as
select a.id, a.title, a.body, a.published_at
from public.announcements a
where a.is_published and a.kind = 'winners';

-- ============ ROLL FUNCTION (atomic click-to-roll) ============

create or replace function public.roll_problem_statement()
returns table (id int, code text, title text, description text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_ps_id int;
begin
  -- caller must be a logged-in team
  select * into v_team from public.teams where auth_user_id = auth.uid();
  if not found then
    raise exception 'ROLL_NO_TEAM: no team linked to this account';
  end if;

  -- idempotent: already rolled -> return existing
  if v_team.problem_statement_id is not null then
    return query
      select ps.id, ps.code, ps.title, ps.description
      from public.problem_statements ps
      where ps.id = v_team.problem_statement_id;
    return;
  end if;

  if v_team.status not in ('registered', 'round1') then
    raise exception 'ROLL_NOT_ELIGIBLE: team status % cannot roll', v_team.status;
  end if;

  -- atomic claim of one random PS with free capacity
  update public.problem_statements ps
     set taken_count = ps.taken_count + 1, updated_at = now()
   where ps.id = (
     select p.id from public.problem_statements p
     where p.is_active and p.taken_count < p.max_teams
     order by random()
     limit 1
     for update skip locked
   )
   returning ps.id into v_ps_id;

  if v_ps_id is null then
    raise exception 'ROLL_POOL_EMPTY: no problem statements available';
  end if;

  update public.teams
     set problem_statement_id = v_ps_id,
         ps_locked_at = now(),
         status = case when status = 'registered' then 'round1' else status end,
         updated_at = now()
   where id = v_team.id;

  return query
    select ps.id, ps.code, ps.title, ps.description
    from public.problem_statements ps
    where ps.id = v_ps_id;
end;
$$;

grant execute on function public.roll_problem_statement() to authenticated;

-- ============ GRANTS (auto-expose is OFF -> explicit, minimal) ============

-- Team-facing reads (RLS restricts rows to the caller's own team)
grant select on public.teams, public.problem_statements, public.submissions
  to authenticated;

-- Public reads
grant select on public.event_settings, public.gallery_photos
  to anon, authenticated;
grant select on public.leaderboard_round1_public, public.leaderboard_final_public,
  public.winners_public
  to anon, authenticated;

-- Service role: full access (used ONLY inside server actions)
grant all on public.teams, public.problem_statements, public.submissions,
  public.scores, public.leaderboard_visibility, public.announcements,
  public.admins, public.event_settings, public.gallery_photos
  to service_role;
grant usage, select on sequence public.problem_statements_id_seq to service_role;

commit;

-- ============ POST-CHECK: nothing in public should be writable by anon/authenticated ============
do $$
declare
  r record;
  bad text[];
begin
  for r in
    select table_name, privilege_type
    from information_schema.table_privileges
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated')
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  loop
    bad := bad || (r.table_name || ':' || r.privilege_type);
  end loop;
  if bad is not null then
    raise exception 'SECURITY CHECK FAILED - unexpected write grants: %', bad;
  end if;
end $$;

