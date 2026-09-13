-- ============================================================
-- 0013 — Fix book_game_slot PL/pgSQL ambiguity
-- Output param names (id/game/start_time) collided with column
-- names in unqualified WHERE clauses -> "column reference is
-- ambiguous" at runtime. Rewritten with table aliases and
-- non-conflicting output names.
-- ============================================================

begin;

drop function if exists public.book_game_slot(uuid);

create or replace function public.book_game_slot(p_slot_id uuid)
returns table (slot_id uuid, slot_game text, slot_start text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.teams%rowtype;
  v_slot public.game_slots%rowtype;
begin
  select * into v_team from public.teams t where t.auth_user_id = auth.uid();
  if not found then
    raise exception 'SLOT_NO_TEAM: no team linked to this account';
  end if;

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
