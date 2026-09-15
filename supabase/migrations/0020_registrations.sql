-- ============================================================
-- 0020 — Public pre-registration form (college registration site
-- is down; this is a stopgap so marketing can point people here).
-- Submitted via a server action using the service role, so no
-- anon/authenticated grants are needed — the same posture as
-- attendance/admin_audit.
-- reg_no is unique so a resubmit (fixing a typo) updates in place
-- instead of creating duplicate rows.
-- ============================================================

begin;

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  reg_no text not null,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index registrations_reg_no_key on public.registrations (lower(reg_no));

alter table public.registrations enable row level security;

grant all on public.registrations to service_role;

create trigger trg_registrations_touch before update on public.registrations
  for each row execute function public.touch_updated_at();

commit;
