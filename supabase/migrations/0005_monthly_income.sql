-- ============================================================================
-- Migration 0005: Simple monthly-income guardrails
-- ----------------------------------------------------------------------------
-- The budget setup is now a single question — "how much do you earn each
-- month?" — and the app derives tiered spending guardrails from it (a safe
-- limit and a hard ceiling, expressed as a % of monthly income). This adds the
-- one column that question persists to. The older income/expense columns are
-- left in place so existing data is untouched.
-- ============================================================================

alter table public.profiles
  add column if not exists monthly_income numeric;
