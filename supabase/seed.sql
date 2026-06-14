-- ============================================================================
-- Optional demo data for "The Cost of One Spin" (personal single-user mode)
-- ----------------------------------------------------------------------------
-- Run AFTER migrations 0001–0004. It fills the single personal profile with a
-- realistic month of activity so you can see the app populated. Re-running it
-- clears prior demo gambling sessions first, so it's safe to repeat.
--
-- Skip this entirely if you'd rather start with a clean slate.
-- ============================================================================

do $$
declare
  uid uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Profile -----------------------------------------------------------------
  update public.profiles set
    full_name          = 'Me',
    hourly_wage        = 32,
    annual_income      = 78000,
    monthly_expenses   = 4200,
    consequence_mode   = true,
    daily_vault_amount = 5,
    future_self_caption = 'My kids'' first overseas trip — this is what I''m playing for.',
    xp                 = 310
  where id = uid;

  -- Current month budget ----------------------------------------------------
  insert into public.monthly_budgets
    (user_id, month, disposable_income, budget_pct, max_budget, recommended_budget)
  values
    (uid, date_trunc('month', current_date)::date, 2300, 1, 25, 23)
  on conflict (user_id, month) do update
    set disposable_income = excluded.disposable_income,
        recommended_budget = excluded.recommended_budget,
        max_budget = excluded.max_budget;

  -- Gambling sessions (clear demo rows first) -------------------------------
  delete from public.gambling_sessions where user_id = uid;

  insert into public.gambling_sessions
    (user_id, amount, venue, gambled_at, mood_before, mood_after, gave_up_category, hours_worked)
  values
    (uid, 40, 'Crown Hotel', now() - interval '47 days', 'stressed', 'regretful', 'savings', 1.25),
    (uid, 120, 'Local RSL',  now() - interval '38 days', 'bored', 'ashamed', 'holiday_fund', 3.75),
    (uid, 25, 'Servo pokies', now() - interval '31 days', 'lonely', 'numb', 'fuel', 0.78),
    (uid, 80, 'Crown Hotel', now() - interval '22 days', 'excited', 'regretful', 'family_meal', 2.5),
    (uid, 15, 'Local RSL',  now() - interval '12 days', 'angry', 'relieved', 'bills', 0.47),
    (uid, 18, 'Local RSL',  now() - interval '3 days',  'bored', 'regretful', 'savings', 0.56);

  -- Savings goals -----------------------------------------------------------
  delete from public.savings_goals where user_id = uid;
  insert into public.savings_goals
    (user_id, title, target_amount, saved_amount, is_primary)
  values
    (uid, 'Family trip to Japan', 8000, 1850, true),
    (uid, 'Emergency fund', 5000, 900, false);

  -- Accountability wall -----------------------------------------------------
  delete from public.accountability_entries where user_id = uid;
  insert into public.accountability_entries (user_id, entry_type, content)
  values
    (uid, 'reason', 'I want to be present for my kids instead of staring at a machine.'),
    (uid, 'reason', 'Every dollar I keep is a step toward the Japan trip we promised them.'),
    (uid, 'worst_loss', 'Lost $600 in a single night and lied about where it went.'),
    (uid, 'cost', 'Missed my daughter''s school concert because I was at the pokies.'),
    (uid, 'cost', 'The savings account I was proud of is back to zero.');

  -- Streak + vault ----------------------------------------------------------
  insert into public.streaks
    (user_id, current_streak, longest_streak, last_gamble_date, streak_start_date, vault_balance)
  values
    (uid, 3, 9, (current_date - 3), (current_date - 3), 45)
  on conflict (user_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = excluded.longest_streak,
        last_gamble_date = excluded.last_gamble_date,
        streak_start_date = excluded.streak_start_date,
        vault_balance = excluded.vault_balance;

  -- Achievements ------------------------------------------------------------
  insert into public.achievements (user_id, code, title)
  values
    (uid, 'streak_3', '3 Days Clear'),
    (uid, 'streak_7', 'One Week Strong')
  on conflict (user_id, code) do nothing;

  raise notice 'Seed complete for personal profile %', uid;
end$$;
