-- 0026 — fix "column reference v_id is ambiguous": the final INSERT's
-- `unnest(...) as v_id` shadowed the plpgsql variable of the same name.
begin;

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
  select v_team.id, x, case when x = v_self_reg_id then 'leader' else 'member' end
  from unnest(v_all_ids) as x;

  return v_team;
end;
$$;

revoke all on function public.create_team_with_members(text, uuid[]) from public;
grant execute on function public.create_team_with_members(text, uuid[]) to authenticated;

create or replace function public.admin_create_team_with_members(
  p_team_name text,
  p_registration_ids uuid[]
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_id uuid;
  v_count int;
  v_team public.teams;
  v_code text;
  v_attempt int := 0;
begin
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_registration_ids, '{}')) as x;
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count < 2 or v_count > 4 then
    raise exception 'TEAM_SIZE_INVALID';
  end if;
  if trim(coalesce(p_team_name, '')) = '' then
    raise exception 'TEAM_NAME_REQUIRED';
  end if;

  for v_id in select unnest(v_ids) order by 1 loop
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
  select v_team.id, x, case when x = v_ids[1] then 'leader' else 'member' end
  from unnest(v_ids) as x;

  return v_team;
end;
$$;

revoke all on function public.admin_create_team_with_members(text, uuid[]) from public;
grant execute on function public.admin_create_team_with_members(text, uuid[]) to service_role;

commit;
