// Shared domain types. These mirror the Supabase schema in
// supabase/migrations and are the single source of truth for the UI layer.

export type MoodValue =
  | 'hopeful'
  | 'bored'
  | 'stressed'
  | 'excited'
  | 'lonely'
  | 'angry'
  | 'numb'
  | 'ashamed'
  | 'relieved'
  | 'regretful';

export type AccountabilityType = 'reason' | 'worst_loss' | 'cost';

export type UrgeTrigger =
  | 'stress'
  | 'boredom'
  | 'social'
  | 'payday'
  | 'habit'
  | 'other';

export type RiskOutcome = 'safe' | 'paused' | 'support';

/**
 * A user-defined high-risk time window that arms the pre-commitment gate.
 * `days` is 0=Sun … 6=Sat; an empty array means "every day". Times are local
 * "HH:MM" (resolved in APP_TIMEZONE). A window whose end is before its start
 * wraps past midnight (e.g. 22:00 → 02:00).
 */
export interface HighRiskWindow {
  id: string;
  label: string;
  days: number[];
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export type ConsequenceCategory =
  | 'family_meal'
  | 'fuel'
  | 'savings'
  | 'mortgage'
  | 'holiday_fund'
  | 'kids'
  | 'bills'
  | 'health';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  hourly_wage: number;
  monthly_income: number | null;
  annual_income: number | null;
  monthly_expenses: number | null;
  spendings_balance: number | null;
  savings_balance: number | null;
  offset_balance: number | null;
  last_clean_checkin: string | null;
  consequence_mode: boolean;
  risk_gate_enabled: boolean;
  support_phone: string | null;
  high_risk_windows: HighRiskWindow[];
  daily_vault_amount: number;
  future_self_image_url: string | null;
  future_self_caption: string | null;
  xp: number;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBudget {
  id: string;
  user_id: string;
  month: string; // YYYY-MM-01
  disposable_income: number;
  budget_pct: number; // percentage, e.g. 1 = 1%
  max_budget: number | null; // user-configurable cap
  recommended_budget: number;
  acknowledged_over: boolean;
  created_at: string;
  updated_at: string;
}

export interface GamblingSession {
  id: string;
  user_id: string;
  amount: number;
  venue: string | null;
  gambled_at: string;
  mood_before: MoodValue | null;
  mood_after: MoodValue | null;
  gave_up_category: ConsequenceCategory | null;
  hours_worked: number;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  saved_amount: number;
  image_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  user_id: string;
  code: string;
  title: string;
  unlocked_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_gamble_date: string | null;
  streak_start_date: string | null;
  vault_balance: number;
  updated_at: string;
}

export interface UrgeLog {
  id: string;
  user_id: string;
  intensity: number; // 0–10
  trigger: UrgeTrigger | null;
  resisted: boolean;
  note: string | null;
  created_at: string;
}

export interface RiskEvent {
  id: string;
  user_id: string;
  outcome: RiskOutcome;
  created_at: string;
}

export interface AccountabilityEntry {
  id: string;
  user_id: string;
  entry_type: AccountabilityType;
  content: string;
  created_at: string;
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  month: string;
  total_gambled: number;
  days_gambled: number;
  biggest_loss: number;
  budget_compliance: boolean;
  money_saved_vs_prev: number;
  generated_at: string;
}
