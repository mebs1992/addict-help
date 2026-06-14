// Pure financial / behavioural calculations. No I/O, fully unit-testable.

import {
  ACHIEVEMENTS,
  GUARDRAIL_CEILING_PCT,
  GUARDRAIL_SAFE_PCT,
  INVEST_ANNUAL_RETURN,
  INVEST_YEARS,
  LEVELS,
  OPPORTUNITY_ITEMS,
  type OpportunityItem,
} from './constants';

export interface Guardrails {
  /** Monthly take-home income the limits are derived from. */
  monthlyIncome: number;
  /** Green ceiling — spending at or under this is low-risk. */
  safeLimit: number;
  /** Red ceiling — spending above this is clearly harmful. */
  ceiling: number;
}

/**
 * Tiered monthly spending guardrails derived from monthly take-home income.
 * This is the whole "budget": a safe limit (1%) and a hard ceiling (3%).
 */
export function guardrailsForIncome(monthlyIncome: number | null): Guardrails {
  const income = Math.max(0, monthlyIncome ?? 0);
  return {
    monthlyIncome: income,
    safeLimit: (income * GUARDRAIL_SAFE_PCT) / 100,
    ceiling: (income * GUARDRAIL_CEILING_PCT) / 100,
  };
}

export type SpendZone = 'safe' | 'caution' | 'danger';

/** Which guardrail zone a month's spend falls into. */
export function spendZone(spent: number, g: Guardrails): SpendZone {
  if (g.ceiling > 0 && spent > g.ceiling) return 'danger';
  if (g.safeLimit > 0 && spent > g.safeLimit) return 'caution';
  return 'safe';
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
