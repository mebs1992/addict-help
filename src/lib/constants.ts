import type {
  ConsequenceCategory,
  FinancialPositionLevel,
  ImpactLevel,
  InterventionLevel,
  MoodValue,
  RiskBand,
  UrgeTrigger,
} from './types';

// The single timezone all "what day / what time is it" decisions resolve to.
// Storage stays in UTC; day boundaries and the risk-gate clock derive from this
// so a late-night session never lands on the wrong calendar day.
export const APP_TIMEZONE = 'Australia/Sydney';

// DEPRECATED (Redesign v2.0): tiered "safe limit" / "hard ceiling" as a % of
// disposable income. These resembled a gambling allowance, so they no longer
// drive any UI — kept only for migration compatibility with persisted
// monthly_budgets rows. The behavioural risk engine below replaces them.
export const GUARDRAIL_SAFE_PCT = 1; // deprecated — was the green "safe limit"
export const GUARDRAIL_CEILING_PCT = 3; // deprecated — was the red "ceiling"

// Absolute exposure fallbacks (in dollars) used when monthly surplus is unknown
// or zero and a months-of-surplus ratio can't be computed.
export const EXPOSURE_MODERATE_CASH = 2000;
export const EXPOSURE_HIGH_CASH = 10000;

// DEPRECATED exposure thresholds (old 2/6-months-of-disposable model). The v2
// engine uses EXPOSURE_MONTHS_MODERATE / EXPOSURE_MONTHS_HIGH below.
export const EXPOSURE_MODERATE_MONTHS = 2;
export const EXPOSURE_HIGH_MONTHS = 6;

// ---------------------------------------------------------------------------
// Behavioural Risk Engine (Redesign v2.0). Three independent dimensions —
// financial position, exposure risk and behavioural risk — replace the old
// gambling-allowance guardrails. The app no longer answers "how much can I
// safely gamble"; it answers "how resilient / exposed / vulnerable am I, and
// what does this decision mean?". See calculations.ts for the engine itself.
// ---------------------------------------------------------------------------

// Dimension 1 — Financial Position. Monthly surplus (income − expenses) as a
// share of expenses: a buffer worth half your costs is Strong, a fifth is
// Stable, anything less is Fragile.
export const FINANCIAL_STRONG_RATIO = 0.5;
export const FINANCIAL_STABLE_RATIO = 0.2;

// Dimension 2 — Exposure Risk. Accessible cash (spendings + savings) measured
// in months of monthly surplus: under one month is Low, one-to-three Moderate,
// beyond three High.
export const EXPOSURE_MONTHS_MODERATE = 1; // ≥ this many months → at least moderate
export const EXPOSURE_MONTHS_HIGH = 3; // > this many months → high

// Dimension 3 — Behavioural Risk. "Recent" lookback for sessions and urges, and
// the urge intensities that escalate the score.
export const BEHAVIOUR_RECENT_DAYS = 7;
export const URGE_INTENSITY_HIGH = 7; // intense / escalating cravings
export const URGE_INTENSITY_MODERATE = 4;

// Impact Analysis — a gamble amount as a share of monthly surplus. States what
// a spend *means*; never whether it is "allowed".
export const IMPACT_LOW_PCT = 2; // < 2% of surplus
export const IMPACT_MODERATE_PCT = 10; // 2–10%
export const IMPACT_HIGH_PCT = 20; // 10–20%; above this is severe

// Human-readable labels + blurbs for the engine. Tone/colour classes live in
// the components (Tailwind can't see dynamically-built class names).
export const FINANCIAL_POSITION_LABELS: Record<FinancialPositionLevel, string> = {
  strong: 'Strong',
  stable: 'Stable',
  fragile: 'Fragile',
};

export const FINANCIAL_POSITION_BLURBS: Record<FinancialPositionLevel, string> = {
  strong:
    'You have a healthy buffer between income and essentials — you could absorb a financial setback.',
  stable:
    'You have some room between income and essentials, but the buffer is modest.',
  fragile:
    'There is little or no room between your income and essentials. A setback would bite hard.',
};

export const RISK_BAND_LABELS: Record<RiskBand, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
};

export const EXPOSURE_BLURBS: Record<RiskBand, string> = {
  low: 'Little cash sits within easy reach — your downside is contained. Keep it that way.',
  moderate:
    'A meaningful amount of cash is within easy reach. Parking spare savings in your offset keeps it out of one-tap range.',
  high: 'A lot of cash is within easy reach, so a single bad moment could do real damage. Moving spare savings into your offset makes it far harder to touch.',
};

export const BEHAVIOURAL_RISK_BLURBS: Record<RiskBand, string> = {
  low: 'No recent gambling and steady urges. You are in a stable stretch.',
  moderate:
    'Some recent urges or an isolated session. Worth staying deliberate right now.',
  high: 'Recent activity and rising urges. This is a vulnerable window — lean on your supports.',
};

export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  low: 'Low impact',
  moderate: 'Moderate impact',
  high: 'High impact',
  severe: 'Severe impact',
};

export const INTERVENTION_LABELS: Record<InterventionLevel, string> = {
  minimal: 'Minimal intervention',
  reflection: 'Reflection + friction',
  maximum: 'Maximum intervention',
};

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

// ---------------------------------------------------------------------------
// Recovery Mode (Feature 7.2) — a slip starts a supportive window instead of a
// shame spiral. The vault keeps filling, just gently, for the first few days.
// ---------------------------------------------------------------------------
export const RECOVERY_WINDOW_DAYS = 7;
export const RECOVERY_REDUCED_VAULT_DAYS = 3; // gentle vault rate for this many days
export const RECOVERY_VAULT_RATE = 0.5; // fraction of the daily vault during recovery

// Rotating, identity-based messages shown during recovery (Feature 7.6, light).
export const RECOVERY_MESSAGES = [
  'A slip is a moment, not a verdict. You came back — that is the whole point.',
  'Recovery is a skill you are practising right now, today.',
  'The person you are becoming would be proud you logged it and kept going.',
  'One session does not erase weeks of work. Steady on.',
  'You are not starting over. You are continuing, wiser.',
];

// ---------------------------------------------------------------------------
// Composite behaviour model (Spec §8) — stability over streak-as-success.
// ---------------------------------------------------------------------------
export const BEHAVIOUR_WINDOW_DAYS = 30; // lookback for the recent-behaviour scores
export const STABILITY_TARGET_DAYS = 30; // days-since-slip that maxes the streak factor
// Need at least this many recent events (sessions + urges + risk gates) before
// the insight engine / scores claim to "know" your patterns.
export const INSIGHT_MIN_EVENTS = 4;

// Stability index → friendly band. Ordered low → high; first match by ceiling.
export const STABILITY_BANDS: { ceiling: number; label: string }[] = [
  { ceiling: 40, label: 'Finding your feet' },
  { ceiling: 70, label: 'Steadying' },
  { ceiling: 90, label: 'Stable' },
  { ceiling: 101, label: 'Strong' },
];

// ---------------------------------------------------------------------------
// Behavioural insight engine (Feature 7.5) — parts of the day events cluster in.
// `endHour` is exclusive; the last part wraps past midnight.
// ---------------------------------------------------------------------------
export interface DayPart {
  key: string;
  label: string;
  emoji: string;
  startHour: number;
  endHour: number;
}

export const DAY_PARTS: DayPart[] = [
  { key: 'morning', label: 'Mornings', emoji: '🌅', startHour: 5, endHour: 12 },
  { key: 'afternoon', label: 'Afternoons', emoji: '☀️', startHour: 12, endHour: 17 },
  { key: 'evening', label: 'Evenings', emoji: '🌆', startHour: 17, endHour: 22 },
  { key: 'late', label: 'Late nights', emoji: '🌙', startHour: 22, endHour: 5 },
];
