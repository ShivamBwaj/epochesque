-- 0004: fix ambiguous column reference in roll_problem_statement (OUT param `id` collided with teams.id)
begin;

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
  select * into v_team from public.teams where auth_user_id = auth.uid();
  if not found then
    raise exception 'ROLL_NO_TEAM: no team linked to this account';
  end if;

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

  update public.teams as t
     set problem_statement_id = v_ps_id,
         ps_locked_at = now(),
         status = case when t.status = 'registered' then 'round1' else t.status end,
         updated_at = now()
   where t.id = v_team.id;

  return query
    select ps.id, ps.code, ps.title, ps.description
    from public.problem_statements ps
    where ps.id = v_ps_id;
end;
$$;

revoke execute on function public.roll_problem_statement() from public, anon;
grant execute on function public.roll_problem_statement() to authenticated;

commit;
