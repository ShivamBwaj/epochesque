-- ============================================================
-- 0017 — Admin-configurable integration secrets (Google Sheet
-- webhook URL for attendance sync). Deliberately NOT event_settings:
-- that table is public-readable, this one must never be.
-- Security: RLS on, ZERO grants to anon/authenticated -> only
-- service-role server actions read/write it.
-- ============================================================

begin;

create table public.integration_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.integration_secrets enable row level security;

grant all on public.integration_secrets to service_role;

commit;
