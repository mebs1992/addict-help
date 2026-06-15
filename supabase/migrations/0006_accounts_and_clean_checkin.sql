-- ============================================================================
-- Migration 0006: Account balances + daily clean check-in
-- ----------------------------------------------------------------------------
-- Two additions:
--   * Account balances (everyday "spendings", savings and mortgage offset) so
--     the app can gauge "exposure risk" — how much cash is within easy reach to
--     gamble. Spendings + savings count as accessible; offset is protected.
--   * last_clean_checkin: the date the person last tapped "I didn't gamble
--     today", so the daily affirmation awards XP at most once per day.
-- ============================================================================

alter table public.profiles
  add column if not exists spendings_balance numeric,
  add column if not exists savings_balance numeric,
  add column if not exists offset_balance numeric,
  add column if not exists last_clean_checkin date;
