-- ============================================================
-- 0041 — Tekken moves to 11:30 AM - 5:00 PM (skipping 1:00-2:00 PM
-- lunch), still 5-min slots. FIFA is untouched (2:00-5:30 PM, 10-min).
-- Zero Tekken bookings exist yet, so this is a clean regenerate,
-- not a migration of live bookings.
--
-- Also splits the single "gaming_open" flag into "tekken_open" and
-- "fifa_open" so the organizers can open one game's slot booking
-- without opening the other.
-- ============================================================

begin;

alter table public.game_slots drop constraint game_slots_slot_index_check;
alter table public.game_slots add constraint game_slots_slot_index_check check (slot_index >= 0 and slot_index < 60);

delete from public.game_slots where game = 'tekken';

with times as (
  select generate_series(690, 775, 5) as m  -- 11:30 - 12:55
  union all
  select generate_series(840, 1015, 5) as m -- 14:00 - 16:55
)
insert into public.game_slots (game, slot_index, start_time)
select 'tekken', (row_number() over (order by m) - 1)::int, lpad((m / 60)::text, 2, '0') || ':' || lpad((m % 60)::text, 2, '0')
from times
order by m;

insert into public.event_settings (key, value)
values ('tekken_open', 'false'::jsonb), ('fifa_open', 'false'::jsonb)
on conflict (key) do nothing;

delete from public.event_settings where key = 'gaming_open';

commit;
