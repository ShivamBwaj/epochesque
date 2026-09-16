-- 0024 — get_my_team() needs ps_locked_at (problem-statement page) and
-- each teammate's email/phone (squad list) — safe to show once you're
-- actually on the team together. Return shape changed so the function
-- must be dropped and recreated.
begin;

drop function if exists public.get_my_team();

create function public.get_my_team()
returns table (
  team_id uuid,
  team_code text,
  team_name text,
  status text,
  problem_statement_id int,
  ps_locked_at timestamptz,
  member_registration_id uuid,
  member_reg_no text,
  member_name text,
  member_email text,
  member_phone text,
  member_role text
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.team_code, t.team_name, t.status, t.problem_statement_id, t.ps_locked_at,
         r.id, r.reg_no, r.name, r.email, r.phone, tm.role
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

commit;
