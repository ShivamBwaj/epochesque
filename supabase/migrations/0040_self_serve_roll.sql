-- ============================================================
-- 0040 — team leaders roll their own problem statement from their
-- dashboard instead of an organizer rolling one team at a time on
-- a projector (doesn't scale past a handful of teams).
--
-- roll_problem_statement() still resolved the caller's team via
-- teams.auth_user_id — the old CSV-import login model. Since 0023,
-- participants log in via registrations.auth_user_id -> team_members
-- -> teams, so this RPC has been silently broken (ROLL_NO_TEAM) for
-- every team under the current signup model, same bug class as
-- book_game_slot() (fixed in 0033). Also adds a leader-only check to
-- match every other team-facing write (submit, gaming, etc).
-- ============================================================

begin;

create or replace function public.roll_problem_statement()
returns table (id int, code text, title text, description text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_is_leader boolean;
  v_current_ps_id int;
  v_status text;
  v_ps_id int;
begin
  select tm.team_id, (tm.role = 'leader'), t.problem_statement_id, t.status
    into v_team_id, v_is_leader, v_current_ps_id, v_status
  from public.registrations r
  join public.team_members tm on tm.registration_id = r.id
  join public.teams t on t.id = tm.team_id
  where r.auth_user_id = auth.uid();

  if v_team_id is null then
    raise exception 'ROLL_NO_TEAM: no team linked to this account';
  end if;
  if not v_is_leader then
    raise exception 'ROLL_LEADER_ONLY: only the team leader can roll';
  end if;

  if v_current_ps_id is not null then
    return query
      select ps.id, ps.code, ps.title, ps.description
      from public.problem_statements ps
      where ps.id = v_current_ps_id;
    return;
  end if;

  if v_status not in ('registered', 'round1') then
    raise exception 'ROLL_NOT_ELIGIBLE: team status % cannot roll', v_status;
  end if;

  perform 1 from public.teams t where t.id = v_team_id for update;

  update public.problem_statements ps
     set taken_count = ps.taken_count + 1, updated_at = now()
   where ps.id = (
     select p.id from public.problem_statements p
     where p.is_active and p.taken_count < p.max_teams
     order by p.taken_count asc, random()
     limit 1
     for update skip locked
   )
   returning ps.id into v_ps_id;

  if v_ps_id is null then
    raise exception 'ROLL_POOL_EMPTY: no problem statements available';
  end if;

  update public.teams as t
     set problem_statement_id = v_ps_id,
         ps_locked_at = now(),
         status = case when t.status = 'registered' then 'round1' else t.status end,
         updated_at = now()
   where t.id = v_team_id;

  return query
    select ps.id, ps.code, ps.title, ps.description
    from public.problem_statements ps
    where ps.id = v_ps_id;
end;
$$;

revoke all on function public.roll_problem_statement() from public, anon;
grant execute on function public.roll_problem_statement() to authenticated;

commit;
