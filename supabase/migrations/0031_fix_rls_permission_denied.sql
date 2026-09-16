-- ============================================================
-- 0031 — The membership-based policies added in 0030 reference
-- team_members/registrations directly in their USING clause, but those
-- tables have zero grants to `authenticated` (by design — service-role
-- and SECURITY DEFINER RPCs only). A policy's own USING subquery still
-- runs as the querying role, so it hit "permission denied for table
-- team_members" instead of just filtering rows. Route through a
-- SECURITY DEFINER helper (owned by postgres, bypasses grants) instead.
-- ============================================================

begin;

create or replace function public.my_team_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select tm.team_id from public.team_members tm
  join public.registrations r on r.id = tm.registration_id
  where r.auth_user_id = auth.uid();
$$;

revoke all on function public.my_team_ids() from public;
grant execute on function public.my_team_ids() to authenticated;

drop policy if exists "teams_select_via_membership" on public.teams;
create policy "teams_select_via_membership" on public.teams
  for select to authenticated
  using (id in (select public.my_team_ids()));

drop policy if exists "ps_select_assigned_via_membership" on public.problem_statements;
create policy "ps_select_assigned_via_membership" on public.problem_statements
  for select to authenticated
  using (
    id in (
      select t.problem_statement_id from public.teams t
      where t.id in (select public.my_team_ids())
    )
  );

drop policy if exists "submissions_select_via_membership" on public.submissions;
create policy "submissions_select_via_membership" on public.submissions
  for select to authenticated
  using (team_id in (select public.my_team_ids()));

commit;
