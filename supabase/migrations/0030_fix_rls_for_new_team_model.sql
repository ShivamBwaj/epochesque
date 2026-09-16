-- ============================================================
-- 0030 — Several RLS policies and book_game_slot() still resolved "my
-- team" via teams.auth_user_id = auth.uid() — the old one-login-per-team
-- model. New self-formed teams have no teams.auth_user_id at all (login
-- lives on registrations now), so these silently returned nothing:
-- submissions reads on /dashboard/submit/round1 and /submit/final always
-- showed "nothing uploaded yet" even after a successful upload, and
-- book_game_slot() rejected every new-model team with SLOT_NO_TEAM.
--
-- Adding parallel policies/logic via team_members — RLS policies are
-- OR'd together, so this doesn't disturb any pre-existing old-model team.
-- ============================================================

begin;

create policy "teams_select_via_membership" on public.teams
  for select to authenticated
  using (
    id in (
      select tm.team_id from public.team_members tm
      join public.registrations r on r.id = tm.registration_id
      where r.auth_user_id = auth.uid()
    )
  );

create policy "ps_select_assigned_via_membership" on public.problem_statements
  for select to authenticated
  using (
    id = (
      select t.problem_statement_id from public.teams t
      where t.id in (
        select tm.team_id from public.team_members tm
        join public.registrations r on r.id = tm.registration_id
        where r.auth_user_id = auth.uid()
      )
    )
  );

create policy "submissions_select_via_membership" on public.submissions
  for select to authenticated
  using (
    team_id in (
      select tm.team_id from public.team_members tm
      join public.registrations r on r.id = tm.registration_id
      where r.auth_user_id = auth.uid()
    )
  );

create or replace function public.book_game_slot(p_slot_id uuid)
returns table (slot_id uuid, slot_game text, slot_start text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_slot public.game_slots%rowtype;
  v_team_id uuid;
begin
  select t.team_id into v_team_id
  from public.team_members t
  join public.registrations r on r.id = t.registration_id
  where r.auth_user_id = auth.uid();

  if v_team_id is null then
    select t.id into v_team_id from public.teams t where t.auth_user_id = auth.uid();
  end if;

  if v_team_id is null then
    raise exception 'SLOT_NO_TEAM: no team linked to this account';
  end if;

  select * into v_team from public.teams t where t.id = v_team_id;
  perform 1 from public.teams t where t.id = v_team.id for update;

  select * into v_slot from public.game_slots gs where gs.id = p_slot_id;
  if not found then
    raise exception 'SLOT_NOT_FOUND: slot does not exist';
  end if;

  if exists (select 1 from public.game_slots gs where gs.taken_by_team_id = v_team.id) then
    raise exception 'SLOT_ALREADY_BOOKED: your team already has a slot';
  end if;

  if v_slot.taken_by_team_id is not null then
    raise exception 'SLOT_TAKEN: another team grabbed this slot';
  end if;

  v_slot := null;
  update public.game_slots gs
     set taken_by_team_id = v_team.id, booked_at = now()
   where gs.id = p_slot_id and gs.taken_by_team_id is null
   returning gs.* into v_slot;

  if v_slot.id is null then
    raise exception 'SLOT_TAKEN: another team grabbed this slot';
  end if;

  return query select v_slot.id, v_slot.game, v_slot.start_time;
end;
$$;

grant execute on function public.book_game_slot(uuid) to authenticated;

commit;
