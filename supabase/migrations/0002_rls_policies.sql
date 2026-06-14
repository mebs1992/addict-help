-- ============================================================================
-- Migration 0002: Row Level Security
-- Every table is owner-scoped: a user can only read/write rows where
-- user_id = auth.uid() (or id = auth.uid() for profiles).
-- ============================================================================

alter table public.profiles               enable row level security;
alter table public.monthly_budgets        enable row level security;
alter table public.gambling_sessions      enable row level security;
alter table public.savings_goals          enable row level security;
alter table public.achievements           enable row level security;
alter table public.streaks                enable row level security;
alter table public.accountability_entries enable row level security;
alter table public.reports                enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Generic owner policies for the remaining tables.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
  owner_tables text[] := array[
    'monthly_budgets',
    'gambling_sessions',
    'savings_goals',
    'achievements',
    'streaks',
    'accountability_entries',
    'reports'
  ];
begin
  foreach t in array owner_tables loop
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id);',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id);',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id);',
      t || '_delete_own', t);
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- Auto-provision a profile + streak row when a new auth user signs up.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  insert into public.streaks (user_id, streak_start_date)
  values (new.id, current_date)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
