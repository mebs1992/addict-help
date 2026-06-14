-- ============================================================================
-- The Cost of One Spin — initial schema
-- Migration 0001: tables, indexes, triggers
-- ============================================================================
-- Notes:
--   * `profiles` is the application "users" table. It is 1:1 with auth.users
--     (Supabase manages credentials in auth.users; app data lives here).
--   * All monetary columns are numeric(12,2) in AUD.
--   * Row Level Security policies are defined in migration 0002.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (the "users" table)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  email                text,
  full_name            text,
  hourly_wage          numeric(10,2) not null default 25,
  annual_income        numeric(12,2),
  monthly_expenses     numeric(12,2),
  consequence_mode     boolean not null default false,
  daily_vault_amount   numeric(10,2) not null default 5,
  future_self_image_url text,
  future_self_caption  text,
  xp                   integer not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- monthly_budgets
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_budgets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  month               date not null,                 -- first day of month
  disposable_income   numeric(12,2) not null default 0,
  budget_pct          numeric(5,2) not null default 1,
  max_budget          numeric(12,2),                 -- user-configurable cap
  recommended_budget  numeric(12,2) not null default 0,
  acknowledged_over   boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists monthly_budgets_user_month_idx
  on public.monthly_budgets (user_id, month desc);

create trigger monthly_budgets_set_updated_at
  before update on public.monthly_budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- gambling_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.gambling_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  amount            numeric(12,2) not null check (amount >= 0),
  venue             text,
  gambled_at        timestamptz not null default now(),
  mood_before       text,
  mood_after        text,
  gave_up_category  text,                            -- Consequence Mode (F10)
  hours_worked      numeric(10,2) not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists gambling_sessions_user_time_idx
  on public.gambling_sessions (user_id, gambled_at desc);

-- ---------------------------------------------------------------------------
-- savings_goals  (also powers Feature 6: Future Self)
-- ---------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  title          text not null,
  target_amount  numeric(12,2) not null default 0,
  saved_amount   numeric(12,2) not null default 0,
  image_url      text,
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists savings_goals_user_idx
  on public.savings_goals (user_id, is_primary desc);

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- achievements
-- ---------------------------------------------------------------------------
create table if not exists public.achievements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  code         text not null,
  title        text not null,
  unlocked_at  timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists achievements_user_idx
  on public.achievements (user_id);

-- ---------------------------------------------------------------------------
-- streaks  (one row per user, also holds the Reward Vault balance)
-- ---------------------------------------------------------------------------
create table if not exists public.streaks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null unique references public.profiles (id) on delete cascade,
  current_streak     integer not null default 0,
  longest_streak     integer not null default 0,
  last_gamble_date   date,
  streak_start_date  date,
  vault_balance      numeric(12,2) not null default 0,
  updated_at         timestamptz not null default now()
);

create trigger streaks_set_updated_at
  before update on public.streaks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- accountability_entries  (Features 8 + reasons-for-quitting)
-- ---------------------------------------------------------------------------
create table if not exists public.accountability_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  entry_type  text not null check (entry_type in ('reason', 'worst_loss', 'cost')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists accountability_user_idx
  on public.accountability_entries (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- reports  (Feature 9: monthly snapshots)
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  month                date not null,
  total_gambled        numeric(12,2) not null default 0,
  days_gambled         integer not null default 0,
  biggest_loss         numeric(12,2) not null default 0,
  budget_compliance    boolean not null default true,
  money_saved_vs_prev  numeric(12,2) not null default 0,
  generated_at         timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists reports_user_month_idx
  on public.reports (user_id, month desc);
