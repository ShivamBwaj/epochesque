-- ============================================================
-- 0010 — Attendance (Day 1 / Day 2, per-member, per-team)
-- Scale: ~80 teams x 4 members x 2 days = 640 rows (trivial).
-- Security: RLS on, ZERO grants to anon/authenticated -> only
-- service-role server actions read/write it.
-- ============================================================

begin;

create table public.attendance (
  day smallint not null check (day in (1, 2)),
  team_id uuid not null references public.teams(id) on delete cascade,
  member_key text not null,
  member_name text not null default '',
  reg_no text not null default '',
  is_present boolean not null default false,
  marked_at timestamptz not null default now(),
  primary key (day, team_id, member_key)
);

alter table public.attendance enable row level security;

create index idx_attendance_team on public.attendance (team_id);

grant all on public.attendance to service_role;

commit;
