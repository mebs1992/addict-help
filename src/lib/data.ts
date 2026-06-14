import { createClient } from './supabase/server';
import { monthKey } from './calculations';
import type {
  AccountabilityEntry,
  Achievement,
  GamblingSession,
  MonthlyBudget,
  Profile,
  SavingsGoal,
  Streak,
} from './types';

/** Returns the signed-in auth user or null. */
export async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Fetch the current user's profile (creating a default row if missing). */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (data) return data as Profile;

  // Self-heal: create a profile if the signup trigger didn't (e.g. local dev).
  const { data: created } = await supabase
    .from('profiles')
    .insert({ id: user.id, email: user.email })
    .select('*')
    .single();
  return (created as Profile) ?? null;
}

/** The budget row for the current month, or null if not yet set up. */
export async function getCurrentBudget(): Promise<MonthlyBudget | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', monthKey())
    .maybeSingle();
  return (data as MonthlyBudget) ?? null;
}

export async function getAllBudgets(): Promise<MonthlyBudget[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: false });
  return (data as MonthlyBudget[]) ?? [];
}

export async function getSessions(limit?: number): Promise<GamblingSession[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  let query = supabase
    .from('gambling_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('gambled_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data as GamblingSession[]) ?? [];
}

export async function getStreak(): Promise<Streak | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (data) return data as Streak;

  const { data: created } = await supabase
    .from('streaks')
    .insert({ user_id: user.id, streak_start_date: new Date().toISOString().slice(0, 10) })
    .select('*')
    .single();
  return (created as Streak) ?? null;
}

export async function getGoals(): Promise<SavingsGoal[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  return (data as SavingsGoal[]) ?? [];
}

export async function getPrimaryGoal(): Promise<SavingsGoal | null> {
  const goals = await getGoals();
  return goals.find((g) => g.is_primary) ?? goals[0] ?? null;
}

export async function getAchievements(): Promise<Achievement[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', user.id)
    .order('unlocked_at', { ascending: false });
  return (data as Achievement[]) ?? [];
}

export async function getAccountabilityEntries(): Promise<
  AccountabilityEntry[]
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('accountability_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return (data as AccountabilityEntry[]) ?? [];
}

/** Total amount gambled in a given month (YYYY-MM-01). */
export function sumSessionsForMonth(
  sessions: GamblingSession[],
  month: string,
): number {
  return sessions
    .filter((s) => monthKey(new Date(s.gambled_at)) === month)
    .reduce((acc, s) => acc + Number(s.amount), 0);
}
