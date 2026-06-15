// Pure financial / behavioural calculations. No I/O, fully unit-testable.

import {
  ACHIEVEMENTS,
  APP_TIMEZONE,
  BEHAVIOUR_WINDOW_DAYS,
  DAY_PARTS,
  EXPOSURE_HIGH_CASH,
  EXPOSURE_HIGH_MONTHS,
  EXPOSURE_MODERATE_CASH,
  EXPOSURE_MODERATE_MONTHS,
  GUARDRAIL_CEILING_PCT,
  GUARDRAIL_SAFE_PCT,
  INSIGHT_MIN_EVENTS,
  INVEST_ANNUAL_RETURN,
  INVEST_YEARS,
  LEVELS,
  OPPORTUNITY_ITEMS,
  RECOVERY_REDUCED_VAULT_DAYS,
  RECOVERY_VAULT_RATE,
  RECOVERY_WINDOW_DAYS,
  STABILITY_BANDS,
  STABILITY_TARGET_DAYS,
  type DayPart,
  type OpportunityItem,
} from './constants';
import type { HighRiskWindow, MoodValue, UrgeTrigger } from './types';

export interface Guardrails {
  /** Monthly take-home income. */
  monthlyIncome: number;
  /** Essential monthly expenses (rent, bills, food…). */
  monthlyExpenses: number;
  /** What's left after essentials — income minus expenses, never negative. */
  disposable: number;
  /** Green ceiling — spending at or under this is low-risk. */
  safeLimit: number;
  /** Red ceiling — spending above this is clearly harmful. */
  ceiling: number;
}

/**
 * Tiered monthly spending guardrails. Gambling money should only come out of
 * what's left after essential expenses, so the limits are a share of disposable
 * income (income − expenses): a safe limit (1%) and a hard ceiling (3%).
 */
export function guardrailsFor(
  monthlyIncome: number | null,
  monthlyExpenses: number | null,
): Guardrails {
  const income = Math.max(0, monthlyIncome ?? 0);
  const expenses = Math.max(0, monthlyExpenses ?? 0);
  const disposable = Math.max(0, income - expenses);
  return {
    monthlyIncome: income,
    monthlyExpenses: expenses,
    disposable,
    safeLimit: (disposable * GUARDRAIL_SAFE_PCT) / 100,
    ceiling: (disposable * GUARDRAIL_CEILING_PCT) / 100,
  };
}

export type SpendZone = 'safe' | 'caution' | 'danger';

/** Which guardrail zone a month's spend falls into. */
export function spendZone(spent: number, g: Guardrails): SpendZone {
  // No disposable income means there's no room to gamble at all.
  if (g.ceiling <= 0) return spent > 0 ? 'danger' : 'safe';
  if (spent > g.ceiling) return 'danger';
  if (spent > g.safeLimit) return 'caution';
  return 'safe';
}

export type ExposureLevel = 'low' | 'moderate' | 'high';

export interface ExposureAssessment {
  /** Cash within easy reach to gamble: spendings + savings. */
  accessible: number;
  /** Funds harder to touch (mortgage offset). */
  protectedFunds: number;
  /** Accessible cash expressed as months of disposable income (null if N/A). */
  months: number | null;
  level: ExposureLevel;
}

/**
 * Exposure risk = how much cash is within easy reach to gamble. Spendings and
 * savings are accessible; the mortgage offset is treated as protected. The more
 * accessible cash relative to spare (disposable) income, the higher the risk.
 */
export function exposureRisk(
  spendings: number | null,
  savings: number | null,
  offset: number | null,
  monthlyDisposable: number,
): ExposureAssessment {
  const accessible = Math.max(0, spendings ?? 0) + Math.max(0, savings ?? 0);
  const protectedFunds = Math.max(0, offset ?? 0);

  let level: ExposureLevel = 'low';
  let months: number | null = null;

  if (accessible <= 0) {
    level = 'low';
  } else if (monthlyDisposable > 0) {
    months = accessible / monthlyDisposable;
    level =
      months >= EXPOSURE_HIGH_MONTHS
        ? 'high'
        : months >= EXPOSURE_MODERATE_MONTHS
          ? 'moderate'
          : 'low';
  } else {
    level =
      accessible >= EXPOSURE_HIGH_CASH
        ? 'high'
        : accessible >= EXPOSURE_MODERATE_CASH
          ? 'moderate'
          : 'low';
  }

  return { accessible, protectedFunds, months, level };
}

/** Hours of work a dollar amount represents at a given hourly wage. */
export function hoursWorked(amount: number, hourlyWage: number): number {
  if (!hourlyWage || hourlyWage <= 0) return 0;
  return amount / hourlyWage;
}

/**
 * Future value if `monthly` were invested every month for `years` at an annual
 * return, compounded monthly. Used for the "could become approximately $Y" line.
 */
export function investedFutureValue(
  monthly: number,
  years: number = INVEST_YEARS,
  annualReturn: number = INVEST_ANNUAL_RETURN,
): number {
  const r = annualReturn / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

/** Percentage over (positive) or under (negative) budget. */
export function percentOverBudget(spent: number, budget: number): number {
  if (budget <= 0) return spent > 0 ? 100 : 0;
  return ((spent - budget) / budget) * 100;
}

export interface OpportunityBreakdownItem extends OpportunityItem {
  quantity: number;
}

/**
 * Greedy "you've spent enough to buy" breakdown. Walks the catalogue from the
 * most aspirational item down, so a big total reads as "1 holiday + 2 weekends"
 * rather than "40 dinners".
 */
export function opportunityBreakdown(
  totalSpent: number,
  maxItems = 4,
): OpportunityBreakdownItem[] {
  const sorted = [...OPPORTUNITY_ITEMS].sort((a, b) => b.cost - a.cost);
  const result: OpportunityBreakdownItem[] = [];
  let remaining = totalSpent;
  for (const item of sorted) {
    if (result.length >= maxItems) break;
    const qty = Math.floor(remaining / item.cost);
    if (qty >= 1) {
      result.push({ ...item, quantity: qty });
      remaining -= qty * item.cost;
    }
  }
  return result;
}

/** Single most relatable item a given amount equals (for check-in feedback). */
export function closestOpportunity(amount: number): OpportunityItem | null {
  if (amount <= 0) return null;
  return (
    [...OPPORTUNITY_ITEMS]
      .sort(
        (a, b) => Math.abs(a.cost - amount) - Math.abs(b.cost - amount),
      )[0] ?? null
  );
}

/** Project a streak's daily vault contribution out to a full year. */
export function projectedYearlySavings(dailyAmount: number): number {
  return dailyAmount * 365;
}

export interface StreakState {
  current: number;
  longest: number;
}

/**
 * Recompute streak given the date of the most recent gamble and "today".
 * Returns days since the last gamble as the current streak.
 */
export function streakFromLastGamble(
  lastGambleDate: string | null,
  today: Date = new Date(),
): number {
  if (!lastGambleDate) {
    // No gamble ever recorded — streak counts from account start is handled
    // elsewhere; here we simply return 0 as a safe default.
    return 0;
  }
  const last = new Date(lastGambleDate + 'T00:00:00');
  const ms = today.getTime() - last.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

/** Achievement codes earned at or below a streak length. */
export function earnedAchievementCodes(streakDays: number): string[] {
  return ACHIEVEMENTS.filter((a) => streakDays >= a.days).map((a) => a.code);
}

/** Next achievement still to unlock, if any. */
export function nextAchievement(streakDays: number) {
  return ACHIEVEMENTS.find((a) => streakDays < a.days) ?? null;
}

/** Resolve XP into a level definition plus progress to the next level. */
export function levelForXp(xp: number) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  const next = LEVELS.find((l) => l.minXp > current.minXp) ?? null;
  const span = next ? next.minXp - current.minXp : 1;
  const into = xp - current.minXp;
  const progressPct = next ? Math.min(100, (into / span) * 100) : 100;
  return { current, next, progressPct, xpIntoLevel: into };
}

/** Sum helper used across dashboards. */
export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

const AUD = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0,
});

const AUD_CENTS = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 2,
});

/** Currency formatter (whole dollars by default). */
export function money(value: number, cents = false): string {
  return (cents ? AUD_CENTS : AUD).format(Number.isFinite(value) ? value : 0);
}

/** First day of the month (YYYY-MM-01) for a given date, in local time. */
export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}-01`;
}

/** Calendar day (YYYY-MM-DD) for a given date, in local time. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Timezone-aware helpers (Australia/Sydney by default).
// `Date` arithmetic stays in UTC; these resolve the wall-clock day/time a user
// actually sees, so the risk gate and any day-bucketing agree on "now".
// ---------------------------------------------------------------------------
export interface ZonedParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number; // 0–23
  minute: number; // 0–59
  weekday: number; // 0=Sun … 6=Sat
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Wall-clock parts of `date` as seen in `timeZone`. */
export function zonedParts(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // Some engines render midnight as "24" under hour12:false — normalise to 0.
  let hour = parseInt(get('hour'), 10);
  if (!Number.isFinite(hour) || hour === 24) hour = 0;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour,
    minute: parseInt(get('minute'), 10) || 0,
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
  };
}

/** Calendar day (YYYY-MM-DD) in `timeZone`. */
export function zonedDayKey(
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** Parse "HH:MM" into minutes-since-midnight, or null if malformed. */
function hhmmToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((value ?? '').trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Is the wall-clock moment `parts` inside this high-risk window? */
export function isWithinWindow(window: HighRiskWindow, parts: ZonedParts): boolean {
  const start = hhmmToMinutes(window.start);
  const end = hhmmToMinutes(window.end);
  if (start === null || end === null || start === end) return false;
  const dayOk = !window.days?.length || window.days.includes(parts.weekday);
  if (!dayOk) return false;
  const now = parts.hour * 60 + parts.minute;
  // start < end: same-day window. Otherwise it wraps past midnight.
  return start < end ? now >= start && now < end : now >= start || now < end;
}

/** The first armed window covering `date`, or null if none is active. */
export function activeRiskWindow(
  windows: HighRiskWindow[],
  date: Date = new Date(),
  timeZone: string = APP_TIMEZONE,
): HighRiskWindow | null {
  if (!windows?.length) return null;
  const parts = zonedParts(date, timeZone);
  return windows.find((w) => isWithinWindow(w, parts)) ?? null;
}

export interface UrgeSummary {
  count: number;
  resisted: number;
  avgIntensity: number;
  topTrigger: UrgeTrigger | null;
}

/** Lightweight roll-up of recent urge logs for the urge dashboard. */
export function summariseUrges(
  logs: { intensity: number; trigger: UrgeTrigger | null; resisted: boolean }[],
): UrgeSummary {
  if (!logs.length) {
    return { count: 0, resisted: 0, avgIntensity: 0, topTrigger: null };
  }
  const totalIntensity = logs.reduce((acc, l) => acc + (l.intensity || 0), 0);
  const resisted = logs.filter((l) => l.resisted).length;
  const counts = new Map<UrgeTrigger, number>();
  for (const l of logs) {
    if (l.trigger) counts.set(l.trigger, (counts.get(l.trigger) ?? 0) + 1);
  }
  let topTrigger: UrgeTrigger | null = null;
  let best = 0;
  for (const [trigger, n] of counts) {
    if (n > best) {
      best = n;
      topTrigger = trigger;
    }
  }
  return {
    count: logs.length,
    resisted,
    avgIntensity: totalIntensity / logs.length,
    topTrigger,
  };
}

/** Milliseconds for an ISO timestamp, or NaN if unparseable. */
function toTime(iso: string): number {
  return new Date(iso).getTime();
}

// ---------------------------------------------------------------------------
// Recovery Mode (Feature 7.2). A slip opens a supportive window rather than
// zeroing everything out. State is derived from the last slip date — no stored
// flag — the same way streak and vault recompute every load.
// ---------------------------------------------------------------------------
export interface RecoveryStatus {
  inRecovery: boolean;
  day: number; // 1-based day within the window (0 when not in recovery)
  daysLeft: number;
}

export function recoveryStatus(
  lastGambleDate: string | null,
  today: Date = new Date(),
  windowDays: number = RECOVERY_WINDOW_DAYS,
): RecoveryStatus {
  if (!lastGambleDate) return { inRecovery: false, day: 0, daysLeft: 0 };
  const since = streakFromLastGamble(lastGambleDate, today);
  if (since >= windowDays) return { inRecovery: false, day: 0, daysLeft: 0 };
  return { inRecovery: true, day: since + 1, daysLeft: windowDays - since };
}

/**
 * Vault balance for a run of gamble-free days. After a slip the first few days
 * earn at a reduced rate (recovery is gentle), then the full daily amount. A
 * never-slipped run always earns the full rate.
 */
export function vaultBalance(
  gambleFreeDays: number,
  daily: number,
  hasSlipped: boolean,
  reducedDays: number = RECOVERY_REDUCED_VAULT_DAYS,
  reducedRate: number = RECOVERY_VAULT_RATE,
): number {
  const free = Math.max(0, gambleFreeDays);
  if (!hasSlipped) return free * daily;
  const discounted = Math.min(free, reducedDays);
  return discounted * daily * reducedRate + (free - discounted) * daily;
}

// ---------------------------------------------------------------------------
// Composite behaviour model (Spec §8). Stability over streak-as-success:
// recovery consistency, urge awareness and days-since-slip blended into one
// index. All inputs are plain arrays so this stays pure and testable.
// ---------------------------------------------------------------------------

/** Distinct gamble-free share of the recent window, as a 0–100 score. */
export function recoveryConsistencyScore(
  sessionDates: string[],
  today: Date = new Date(),
  windowDays: number = BEHAVIOUR_WINDOW_DAYS,
): number {
  const cutoff = today.getTime() - windowDays * 86400000;
  const days = new Set<string>();
  for (const d of sessionDates) {
    const t = toTime(d);
    if (Number.isFinite(t) && t >= cutoff) days.add(zonedDayKey(new Date(d)));
  }
  const gambleDays = Math.min(days.size, windowDays);
  return Math.round(((windowDays - gambleDays) / windowDays) * 100);
}

export interface BehaviourModel {
  daysSinceSlip: number | null; // null = no slip ever recorded
  recoveryConsistency: number; // 0–100
  urgeAwareness: number; // 0–100
  stabilityIndex: number; // 0–100 composite
  stabilityLabel: string;
  events: number; // recent activity feeding the model
  hasSignal: boolean; // enough data to be meaningful
}

export function behaviourModel(input: {
  lastGambleDate: string | null;
  sessionDates: string[];
  urgeDates: string[];
  riskEventCount?: number;
  today?: Date;
  windowDays?: number;
}): BehaviourModel {
  const {
    lastGambleDate,
    sessionDates,
    urgeDates,
    riskEventCount = 0,
    today = new Date(),
    windowDays = BEHAVIOUR_WINDOW_DAYS,
  } = input;
  const cutoff = today.getTime() - windowDays * 86400000;
  const recentSessions = sessionDates.filter((d) => toTime(d) >= cutoff).length;
  const recentUrges = urgeDates.filter((d) => toTime(d) >= cutoff).length;

  const daysSinceSlip = lastGambleDate
    ? streakFromLastGamble(lastGambleDate, today)
    : null;

  const recoveryConsistency = recoveryConsistencyScore(
    sessionDates,
    today,
    windowDays,
  );

  const awareTotal = recentUrges + recentSessions;
  const urgeAwareness =
    awareTotal === 0 ? 0 : Math.round((recentUrges / awareTotal) * 100);

  const streakFactor =
    daysSinceSlip === null
      ? 100
      : Math.min(100, (daysSinceSlip / STABILITY_TARGET_DAYS) * 100);

  const stabilityIndex = Math.round(
    0.4 * recoveryConsistency + 0.3 * urgeAwareness + 0.3 * streakFactor,
  );
  const stabilityLabel =
    STABILITY_BANDS.find((b) => stabilityIndex < b.ceiling)?.label ?? 'Strong';

  const events = recentSessions + recentUrges + riskEventCount;

  return {
    daysSinceSlip,
    recoveryConsistency,
    urgeAwareness,
    stabilityIndex,
    stabilityLabel,
    events,
    hasSignal: events >= INSIGHT_MIN_EVENTS,
  };
}

// ---------------------------------------------------------------------------
// Behavioural insight engine (Feature 7.5). Pure roll-ups over the data Phase 1
// collects: when risk clusters, what triggers it, and how mood maps to spend.
// ---------------------------------------------------------------------------
function dayPartForHour(hour: number): DayPart {
  return (
    DAY_PARTS.find((p) =>
      p.startHour < p.endHour
        ? hour >= p.startHour && hour < p.endHour
        : hour >= p.startHour || hour < p.endHour,
    ) ?? DAY_PARTS[0]
  );
}

export interface DayPartCount {
  part: DayPart;
  count: number;
}

/** Which parts of the day risk events cluster in, busiest first. */
export function riskTimeWindows(
  timestamps: string[],
  timeZone: string = APP_TIMEZONE,
): DayPartCount[] {
  const counts = new Map<string, number>();
  for (const iso of timestamps) {
    const t = toTime(iso);
    if (!Number.isFinite(t)) continue;
    const part = dayPartForHour(zonedParts(new Date(iso), timeZone).hour);
    counts.set(part.key, (counts.get(part.key) ?? 0) + 1);
  }
  return DAY_PARTS.map((part) => ({ part, count: counts.get(part.key) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

export interface TriggerCount {
  trigger: UrgeTrigger;
  count: number;
}

/** Urge triggers ranked by frequency. */
export function rankTriggers(triggers: (UrgeTrigger | null)[]): TriggerCount[] {
  const counts = new Map<UrgeTrigger, number>();
  for (const t of triggers) {
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([trigger, count]) => ({ trigger, count }))
    .sort((a, b) => b.count - a.count);
}

export interface MoodSpend {
  mood: MoodValue;
  total: number;
  count: number;
}

/** Total spend grouped by the mood logged before each session. */
export function moodSpendBreakdown(
  sessions: { mood_before: MoodValue | null; amount: number }[],
): MoodSpend[] {
  const map = new Map<MoodValue, { total: number; count: number }>();
  for (const s of sessions) {
    if (!s.mood_before) continue;
    const cur = map.get(s.mood_before) ?? { total: 0, count: 0 };
    cur.total += Number(s.amount) || 0;
    cur.count += 1;
    map.set(s.mood_before, cur);
  }
  return [...map.entries()]
    .map(([mood, v]) => ({ mood, ...v }))
    .sort((a, b) => b.total - a.total);
}

/** Deterministically rotate through a set of messages, advancing daily. */
export function rotatingMessage(messages: string[], date: Date = new Date()): string {
  if (!messages.length) return '';
  const idx = Math.floor(date.getTime() / 86400000) % messages.length;
  return messages[idx];
}
