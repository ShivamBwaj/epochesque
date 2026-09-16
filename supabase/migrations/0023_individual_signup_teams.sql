-- ============================================================
-- 0023 — Individual self-serve signup + participant-formed teams.
-- Registration numbers/teams are no longer known ahead of time: every
-- row in `registrations` can become its own login, and teams are formed
-- by participants themselves (2-4 people), not imported by an admin.
--
-- `teams.auth_user_id` / `leader_email` / `members` (jsonb) stay in
-- place for now (old CSV-import teams still reference them) but are no
-- longer required for new teams — membership now lives in
-- `team_members`, keyed off `registrations`, one row per person, ever
-- (the unique index on registration_id is what makes "can't be in two
-- teams" and "no switching" automatic).
-- ============================================================

begin;

alter table public.teams alter column leader_email drop not null;

alter table public.registrations
  add column auth_user_id uuid unique references auth.users(id) on delete set null;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  role text not null check (role in ('leader', 'member')),
  joined_at timestamptz not null default now()
);

create index team_members_team_id_idx on public.team_members (team_id);

create unique index team_members_one_leader_per_team on public.team_members (team_id)
  where role = 'leader';

alter table public.team_members enable row level security;

-- Zero anon/authenticated grants, same posture as registrations/scores/
-- admin_audit — every access goes through the SECURITY DEFINER RPCs
-- below or a service-role server action.
grant all on public.team_members to service_role;

create or replace function public.team_member_count(p_team_id uuid)
returns int language sql stable as $$
  select count(*)::int from public.team_members where team_id = p_team_id;
$$;

-- ============================================================
-- create_team_with_members(team_name, teammate_registration_ids)
-- Caller (auth.uid()) becomes leader; teammates are the other 1-3
-- registration ids. Atomic: locks every registration row involved so
-- two people can't be raced onto the same roster, checks nobody is
-- already teamed, checks final size is 2-4, creates the team + all
-- member rows in one transaction.
-- ============================================================
create or replace function public.create_team_with_members(
  p_team_name text,
  p_teammate_registration_ids uuid[]
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self_reg_id uuid;
  v_all_ids uuid[];
  v_id uuid;
  v_count int;
  v_team public.teams;
  v_code text;
  v_attempt int := 0;
begin
  select id into v_self_reg_id from public.registrations where auth_user_id = auth.uid();
  if v_self_reg_id is null then
    raise exception 'NOT_REGISTERED';
  end if;

  select array_agg(distinct x) into v_all_ids
  from unnest(array_append(coalesce(p_teammate_registration_ids, '{}'), v_self_reg_id)) as x;

  v_count := coalesce(array_length(v_all_ids, 1), 0);
  if v_count < 2 or v_count > 4 then
    raise exception 'TEAM_SIZE_INVALID';
  end if;

  if trim(coalesce(p_team_name, '')) = '' then
    raise exception 'TEAM_NAME_REQUIRED';
  end if;

  -- Lock every involved registration row (stable order = self first, then
  -- sorted ids) so two concurrent team-creation attempts touching an
  -- overlapping roster serialize instead of racing.
  for v_id in select unnest(v_all_ids) order by 1 loop
    perform 1 from public.registrations where id = v_id for update;
    if not found then
      raise exception 'REGISTRATION_NOT_FOUND';
    end if;
    if exists (select 1 from public.team_members where registration_id = v_id) then
      raise exception 'ALREADY_ON_A_TEAM';
    end if;
  end loop;

  loop
    v_attempt := v_attempt + 1;
    v_code := 'T-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into public.teams (team_code, team_name, status)
      values (v_code, trim(p_team_name), 'registered')
      returning * into v_team;
      exit;
    exception when unique_violation then
      if v_attempt > 20 then
        raise exception 'COULD_NOT_ALLOCATE_TEAM_CODE';
      end if;
    end;
  end loop;

  insert into public.team_members (team_id, registration_id, role)
  select v_team.id, v_id, case when v_id = v_self_reg_id then 'leader' else 'member' end
  from unnest(v_all_ids) as v_id;

  return v_team;
end;
$$;

revoke all on function public.create_team_with_members(text, uuid[]) from public;
grant execute on function public.create_team_with_members(text, uuid[]) to authenticated;

-- ============================================================
-- search_teammates(query) — teamless registrations matching a reg-no
-- or name search, excluding the caller. Used to populate the "add
-- teammates" picker during team creation. Returns only the columns
-- needed to pick someone, never phone/email.
-- ============================================================
create or replace function public.search_teammates(p_query text)
returns table (id uuid, reg_no text, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_self_reg_id uuid;
  v_q text := trim(coalesce(p_query, ''));
begin
  select r.id into v_self_reg_id from public.registrations r where r.auth_user_id = auth.uid();
  if v_self_reg_id is null then
    raise exception 'NOT_REGISTERED';
  end if;

  return query
  select r.id, r.reg_no, r.name
  from public.registrations r
  where r.id <> v_self_reg_id
    and not exists (select 1 from public.team_members tm where tm.registration_id = r.id)
    and (
      v_q = ''
      or r.reg_no ilike '%' || v_q || '%'
      or r.name ilike '%' || v_q || '%'
    )
  order by r.name
  limit 20;
end;
$$;

revoke all on function public.search_teammates(text) from public;
grant execute on function public.search_teammates(text) to authenticated;

-- ============================================================
-- get_my_team() — the caller's team + roster (name/reg_no/role only),
-- or no rows if they're not on a team yet. Keeps `registrations` at
-- zero direct grants while still letting the dashboard show teammates.
-- ============================================================
create or replace function public.get_my_team()
returns table (
  team_id uuid,
  team_code text,
  team_name text,
  status text,
  problem_statement_id int,
  member_registration_id uuid,
  member_reg_no text,
  member_name text,
  member_role text
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.team_code, t.team_name, t.status, t.problem_statement_id,
         r.id, r.reg_no, r.name, tm.role
  from public.registrations me
  join public.team_members mytm on mytm.registration_id = me.id
  join public.teams t on t.id = mytm.team_id
  join public.team_members tm on tm.team_id = t.id
  join public.registrations r on r.id = tm.registration_id
  where me.auth_user_id = auth.uid()
  order by (tm.role = 'leader') desc, r.name;
$$;

revoke all on function public.get_my_team() from public;
grant execute on function public.get_my_team() to authenticated;

-- ============================================================
-- admin_move_team_member(registration_id, new_team_id) — service-role
-- only. new_team_id = null removes them from their team entirely
-- (back to the unassigned pool). Blocks pushing a destination team
-- past 4; leaving a team below 2 is allowed (admin is mid-fix) but the
-- caller (server action) surfaces it as an "incomplete team" warning.
-- ============================================================
create or replace function public.admin_move_team_member(
  p_registration_id uuid,
  p_new_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dest_count int;
begin
  perform 1 from public.registrations where id = p_registration_id for update;
  if not found then
    raise exception 'REGISTRATION_NOT_FOUND';
  end if;

  if p_new_team_id is not null then
    perform 1 from public.teams where id = p_new_team_id for update;
    if not found then
      raise exception 'TEAM_NOT_FOUND';
    end if;
    select public.team_member_count(p_new_team_id) into v_dest_count;
    if v_dest_count >= 4 then
      raise exception 'TEAM_FULL';
    end if;
  end if;

  if not exists (select 1 from public.team_members where registration_id = p_registration_id) then
    if p_new_team_id is null then
      return;
    end if;
    insert into public.team_members (team_id, registration_id, role)
    values (p_new_team_id, p_registration_id, 'member');
    return;
  end if;

  if p_new_team_id is null then
    delete from public.team_members where registration_id = p_registration_id;
    return;
  end if;

  update public.team_members
  set team_id = p_new_team_id, role = 'member'
  where registration_id = p_registration_id;
end;
$$;

revoke all on function public.admin_move_team_member(uuid, uuid) from public;
grant execute on function public.admin_move_team_member(uuid, uuid) to service_role;

create or replace function public.admin_set_team_leader(p_team_id uuid, p_registration_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.team_members where team_id = p_team_id and registration_id = p_registration_id) then
    raise exception 'NOT_ON_TEAM';
  end if;
  update public.team_members set role = 'member' where team_id = p_team_id;
  update public.team_members set role = 'leader' where team_id = p_team_id and registration_id = p_registration_id;
end;
$$;

revoke all on function public.admin_set_team_leader(uuid, uuid) from public;
grant execute on function public.admin_set_team_leader(uuid, uuid) to service_role;

commit;
