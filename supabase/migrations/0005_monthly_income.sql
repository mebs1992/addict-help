-- ============================================================================
-- Migration 0005: Simple monthly-income guardrails
-- ----------------------------------------------------------------------------
-- The budget setup is now two questions — monthly income and essential monthly
-- expenses — and the app derives tiered spending guardrails (a safe limit and a
-- hard ceiling) from the disposable income left after expenses. Expenses reuse
-- the existing profiles.monthly_expenses column; this adds the monthly_income
-- column the setup persists alongside it.
-- ============================================================================

alter table public.profiles
  add column if not exists monthly_income numeric;
