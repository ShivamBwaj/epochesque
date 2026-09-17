-- ============================================================
-- 0039 — Tekken slots become 5 minutes each (FIFA stays 10 min).
-- 3.5-hour window / 5 min = 42 slots for Tekken vs 21 for FIFA, so
-- the per-game slot_index range has to widen. No bookings existed
-- for either game at migration time (confirmed 0/21 both), so this
-- is a clean drop + recreate for Tekken only — FIFA's rows are
-- untouched.
-- ============================================================

begin;

alter table public.game_slots drop constraint if exists game_slots_slot_index_check;
alter table public.game_slots add constraint game_slots_slot_index_check check (slot_index >= 0 and slot_index < 42);

delete from public.game_slots where game = 'tekken';

insert into public.game_slots (game, slot_index, start_time)
select 'tekken', i, to_char((interval '14 hours' + (i * interval '5 minutes')), 'HH24:MI')
from generate_series(0, 41) as i
on conflict do nothing;

commit;
