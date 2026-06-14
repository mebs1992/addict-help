-- ============================================================================
-- Migration 0004: Personal single-user mode (no accounts / no login)
-- ----------------------------------------------------------------------------
-- All app data belongs to one fixed profile. The app reads/writes on the
-- server with the service-role key, so we no longer depend on Supabase Auth.
--   * Detach profiles.id from auth.users (we won't create auth users).
--   * Remove the new-user signup trigger.
--   * Insert the single personal profile + its streak row.
-- The fixed id below must match PERSONAL_USER_ID in src/lib/config.ts.
-- ============================================================================

-- 1) Stop requiring a matching auth.users row for a profile.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- 2) Remove the signup trigger/function (no signups in personal mode).
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 3) Provision the single personal profile + streak.
insert into public.profiles (id, full_name)
values ('00000000-0000-0000-0000-000000000001', 'Me')
on conflict (id) do nothing;

insert into public.streaks (user_id, streak_start_date)
values ('00000000-0000-0000-0000-000000000001', current_date)
on conflict (user_id) do nothing;
