import type { ConsequenceCategory, MoodValue, UrgeTrigger } from './types';

// The single timezone all "what day / what time is it" decisions resolve to.
// Storage stays in UTC; day boundaries and the risk-gate clock derive from this
// so a late-night session never lands on the wrong calendar day.
export const APP_TIMEZONE = 'Australia/Sydney';

// Tiered monthly spending guardrails, as a % of disposable income (monthly
// take-home income minus essential expenses). Spend at or below the safe limit
// is "green"; above the ceiling is clearly harmful ("red"); in between is
// "caution". The whole budget setup is derived from these two numbers, the
// person's monthly income and their monthly expenses.
export const GUARDRAIL_SAFE_PCT = 1; // green ceiling — a low-risk limit
export const GUARDRAIL_CEILING_PCT = 3; // red ceiling — clear harm above this

// Exposure risk: accessible cash (spendings + savings) measured in months of
// disposable income. The more reachable cash, the more a single bad night can
// destroy — so a big accessible balance relative to spare income reads as
// higher exposure.
export const EXPOSURE_MODERATE_MONTHS = 2;
export const EXPOSURE_HIGH_MONTHS = 6;
// Absolute fallbacks (in dollars) when disposable income is unknown / zero.
export const EXPOSURE_MODERATE_CASH = 2000;
export const EXPOSURE_HIGH_CASH = 10000;

// Fallback hourly wage used when a user hasn't set income details yet.
export const DEFAULT_HOURLY_WAGE = 25;

// Daily amount credited to the Reward Vault for every gamble-free day.
export const DEFAULT_DAILY_VAULT = 5;

// Assumptions for the "invested instead" projection (Feature 2).
export const INVEST_ANNUAL_RETURN = 0.07; // 7% nominal annual return
export const INVEST_YEARS = 10;

// Opportunity-cost catalogue (Feature 3). Ordered cheapest -> most aspirational.
export interface OpportunityItem {
  label: string;
  cost: number;
  emoji: string;
}

export const OPPORTUNITY_ITEMS: OpportunityItem[] = [
  { label: 'tank of fuel', cost: 80, emoji: '⛽' },
  { label: 'family dinner', cost: 50, emoji: '🍝' },
  { label: 'week of groceries', cost: 150, emoji: '🛒' },
  { label: 'PlayStation game', cost: 90, emoji: '🎮' },
  { label: 'pair of running shoes', cost: 160, emoji: '👟' },
  { label: 'monthly phone bill', cost: 60, emoji: '📱' },
  { label: 'kids sports season', cost: 250, emoji: '⚽' },
  { label: 'weekend getaway', cost: 500, emoji: '🏕️' },
  { label: 'month of rent help', cost: 1200, emoji: '🏠' },
  { label: 'family holiday deposit', cost: 1500, emoji: '🏝️' },
  { label: 'overseas flight', cost: 2000, emoji: '✈️' },
];

// Mood options for check-ins (Feature 2).
export const MOODS: { value: MoodValue; label: string; emoji: string }[] = [
  { value: 'hopeful', label: 'Hopeful', emoji: '🌤️' },
  { value: 'bored', label: 'Bored', emoji: '😐' },
  { value: 'stressed', label: 'Stressed', emoji: '😣' },
  { value: 'excited', label: 'Excited', emoji: '🤩' },
  { value: 'lonely', label: 'Lonely', emoji: '🥺' },
  { value: 'angry', label: 'Angry', emoji: '😠' },
  { value: 'numb', label: 'Numb', emoji: '😶' },
  { value: 'ashamed', label: 'Ashamed', emoji: '😔' },
  { value: 'relieved', label: 'Relieved', emoji: '😮‍💨' },
  { value: 'regretful', label: 'Regretful', emoji: '😞' },
];

// Consequence Mode categories (Feature 10).
export const CONSEQUENCE_CATEGORIES: {
  value: ConsequenceCategory;
  label: string;
  emoji: string;
}[] = [
  { value: 'family_meal', label: 'Family meal', emoji: '🍽️' },
  { value: 'fuel', label: 'Fuel', emoji: '⛽' },
  { value: 'savings', label: 'Savings', emoji: '🏦' },
  { value: 'mortgage', label: 'Mortgage', emoji: '🏠' },
  { value: 'holiday_fund', label: 'Holiday fund', emoji: '🏝️' },
  { value: 'kids', label: 'Kids', emoji: '🧒' },
  { value: 'bills', label: 'Bills', emoji: '🧾' },
  { value: 'health', label: 'Health', emoji: '❤️‍🩹' },
];

// Urge triggers (Feature 7.4). What was driving the craving — the dataset the
// behavioural-insight engine will eventually learn from.
export const URGE_TRIGGERS: {
  value: UrgeTrigger;
  label: string;
  emoji: string;
}[] = [
  { value: 'stress', label: 'Stress', emoji: '😣' },
  { value: 'boredom', label: 'Boredom', emoji: '😐' },
  { value: 'social', label: 'Social', emoji: '👥' },
  { value: 'payday', label: 'Payday', emoji: '💸' },
  { value: 'habit', label: 'Habit loop', emoji: '🔁' },
  { value: 'other', label: 'Something else', emoji: '❓' },
];

// Pre-commitment risk gate (Feature 7.1).
// Default crisis line shown on the gate's "Call support" option (AU, 24/7).
export const DEFAULT_SUPPORT_PHONE = '1800858858';
export const DEFAULT_SUPPORT_LABEL = 'Gambling Help · 1800 858 858';
// "I'm safe" stays disabled for this long — a deliberate delay at the decision
// point so the impulse has to wait the friction out.
export const RISK_GATE_SAFE_DELAY_SECONDS = 20;
// After clearing the gate, it stays dismissed this long before it can re-arm.
export const RISK_GATE_REPRIEVE_MINUTES = 45;

// Streak achievements (Feature 5).
export interface AchievementDef {
  code: string;
  days: number;
  title: string;
  emoji: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { code: 'streak_3', days: 3, title: '3 Days Clear', emoji: '🌱' },
  { code: 'streak_7', days: 7, title: 'One Week Strong', emoji: '🔥' },
  { code: 'streak_30', days: 30, title: 'One Month Free', emoji: '🌟' },
  { code: 'streak_90', days: 90, title: 'Three Months', emoji: '💎' },
  { code: 'streak_180', days: 180, title: 'Half a Year', emoji: '🏆' },
  { code: 'streak_365', days: 365, title: 'One Full Year', emoji: '👑' },
];

// XP rewards (Feature 13).
export const XP = {
  LOG_SESSION: 15, // logging honestly, even a loss
  GAMBLE_FREE_DAY: 10,
  LOG_URGE: 15, // naming an urge instead of acting on it (Feature 7.4)
  RISK_GATE_SAFE: 15, // cleared the pre-commitment gate safely (Feature 7.1)
  WITHIN_BUDGET_MONTH: 100,
  REVIEW_REPORT: 25,
  ACCOUNTABILITY_ENTRY: 20,
  EMERGENCY_PAUSE_COMPLETED: 50,
};

// XP levels (Feature 13).
export interface LevelDef {
  level: number;
  name: string;
  minXp: number;
  emoji: string;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: 'Taking Control', minXp: 0, emoji: '🧭' },
  { level: 2, name: 'Building Discipline', minXp: 250, emoji: '🛡️' },
  { level: 3, name: 'Consistent Saver', minXp: 750, emoji: '💰' },
  { level: 4, name: 'Financial Freedom', minXp: 2000, emoji: '🕊️' },
];

// Emergency pause length (Feature 7), in seconds.
export const EMERGENCY_PAUSE_SECONDS = 10 * 60;
