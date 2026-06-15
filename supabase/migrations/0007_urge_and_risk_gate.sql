-- ============================================================================
-- Migration 0007: Urge tracking + pre-commitment risk gate
-- ----------------------------------------------------------------------------
-- Two new behavioural-interruption systems (Phase 1 of the target spec):
--   * urge_logs   — a craving the person rode out (or that preceded a slip).
--                   Replaces the low-signal binary "I didn't gamble" tap with
--                   intensity + trigger, so the app can learn patterns later.
--   * risk_events — each time the pre-commitment gate fired and what the person
--                   chose ('safe' / 'paused' / 'support').
-- Plus profile config for the gate: an enable flag, an optional support line,
-- and the high-risk time windows (stored as jsonb) that arm the gate.
-- ============================================================================

alter table public.profiles
  add column if not exists risk_gate_enabled boolean not null default false,
  add column if not exists support_phone     text,
  add column if not exists high_risk_windows  jsonb not null default '[]'::jsonb;

-- ---------------------------------------------------------------------------
-- urge_logs  (Feature 7.4: urge tracking)
-- ---------------------------------------------------------------------------
create table if not exists public.urge_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  intensity   integer not null default 0 check (intensity between 0 and 10),
  trigger     text,                                   -- stress|boredom|social|payday|habit|other
  resisted    boolean not null default true,          -- did they ride it out?
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists urge_logs_user_time_idx
  on public.urge_logs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- risk_events  (Feature 7.1: pre-commitment friction gate)
-- ---------------------------------------------------------------------------
create table if not exists public.risk_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  outcome     text not null check (outcome in ('safe', 'paused', 'support')),
  created_at  timestamptz not null default now()
);

create index if not exists risk_events_user_time_idx
  on public.risk_events (user_id, created_at desc);
