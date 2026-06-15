import { createClient } from './supabase/server';
import { PERSONAL_USER_ID } from './config';
import { monthKey } from './calculations';
import type {
  AccountabilityEntry,
  Achievement,
  GamblingSession,
  MonthlyBudget,
  Profile,
  RiskEvent,
  SavingsGoal,
  Streak,
  UrgeLog,
} from './types';

/** Fetch the personal profile, creating a default row if missing. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', PERSONAL_USER_ID)
    .maybeSingle();

  if (data) return data as Profile;

  // Self-heal: create the profile if the migration/seed didn't.
  const { data: created } = await supabase
    .from('profiles')
    .insert({ id: PERSONAL_USER_ID, full_name: '' })
    .select('*')
    .single();
  return (created as Profile) ?? null;
}

/** The budget row for the current month, or null if not yet set up. */
export async function getCurrentBudget(): Promise<MonthlyBudget | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .eq('month', monthKey())
    .maybeSingle();
  return (data as MonthlyBudget) ?? null;
}

export async function getAllBudgets(): Promise<MonthlyBudget[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('monthly_budgets')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .order('month', { ascending: false });
  return (data as MonthlyBudget[]) ?? [];
}

export async function getSessions(limit?: number): Promise<GamblingSession[]> {
  const supabase = createClient();
  let query = supabase
    .from('gambling_sessions')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .order('gambled_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data as GamblingSession[]) ?? [];
}

export async function getStreak(): Promise<Streak | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .maybeSingle();
  if (data) return data as Streak;

  const { data: created } = await supabase
    .from('streaks')
    .insert({
      user_id: PERSONAL_USER_ID,
      streak_start_date: new Date().toISOString().slice(0, 10),
    })
    .select('*')
    .single();
  return (created as Streak) ?? null;
}

export async function getGoals(): Promise<SavingsGoal[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
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
  const { data } = await supabase
    .from('achievements')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .order('unlocked_at', { ascending: false });
  return (data as Achievement[]) ?? [];
}

export async function getAccountabilityEntries(): Promise<
  AccountabilityEntry[]
> {
  const supabase = createClient();
  const { data } = await supabase
    .from('accountability_entries')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .order('created_at', { ascending: false });
  return (data as AccountabilityEntry[]) ?? [];
}

export async function getUrgeLogs(limit?: number): Promise<UrgeLog[]> {
  const supabase = createClient();
  let query = supabase
    .from('urge_logs')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data as UrgeLog[]) ?? [];
}

export async function getRiskEvents(limit?: number): Promise<RiskEvent[]> {
  const supabase = createClient();
  let query = supabase
    .from('risk_events')
    .select('*')
    .eq('user_id', PERSONAL_USER_ID)
    .order('created_at', { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return (data as RiskEvent[]) ?? [];
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

/** Everything the Emergency Pause / risk gate needs to ground the moment. */
export interface EmergencyPauseContext {
  monthlyLosses: number;
  currentStreak: number;
  goalTitle: string | null;
  goalSaved: number;
  goalTarget: number;
  reasons: string[];
}

export async function getEmergencyPauseContext(): Promise<EmergencyPauseContext> {
  const [sessions, streak, goal, accountability] = await Promise.all([
    getSessions(),
    getStreak(),
    getPrimaryGoal(),
    getAccountabilityEntries(),
  ]);
  return {
    monthlyLosses: sumSessionsForMonth(sessions, monthKey()),
    currentStreak: streak?.current_streak ?? 0,
    goalTitle: goal?.title ?? null,
    goalSaved: goal ? Number(goal.saved_amount) : 0,
    goalTarget: goal ? Number(goal.target_amount) : 0,
    reasons: accountability
      .filter((e) => e.entry_type === 'reason')
      .map((e) => e.content)
      .slice(0, 3),
  };
}
