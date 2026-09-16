-- ============================================================
-- 0027 — Attendance now keys off the individual registrant, not the
-- team. Teams no longer exist before the event starts (participants
-- form them on the spot), so attendance has to work for anyone in
-- `registrations` regardless of team status. No real attendance data
-- exists yet (pre-event), so this is a clean drop + recreate rather
-- than a data migration.
-- ============================================================

begin;

drop table if exists public.attendance;

create table public.attendance (
  day smallint not null check (day in (1, 2)),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  is_present boolean not null default false,
  marked_at timestamptz not null default now(),
  primary key (day, registration_id)
);

alter table public.attendance enable row level security;

create index idx_attendance_registration on public.attendance (registration_id);

grant all on public.attendance to service_role;

commit;
