-- 0005: admin audit log + DB-level guard: scores immutable while leaderboard published
begin;

create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  actor_email text not null default '',
  action text not null,
  target text not null default '',
  details jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit enable row level security;

grant all on public.admin_audit to service_role;

create index admin_audit_created_idx on public.admin_audit (created_at desc);

create or replace function public.guard_scores_locked()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if exists (
    select 1 from public.leaderboard_visibility lv
    where lv.round = new.round and lv.is_published
  ) then
    raise exception 'SCORES_LOCKED: unpublish the % leaderboard before editing scores', new.round;
  end if;
  return new;
end $$;

create trigger trg_scores_locked
  before insert or update on public.scores
  for each row execute function public.guard_scores_locked();

commit;
