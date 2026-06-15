'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { PERSONAL_USER_ID } from './config';
import {
  dayKey,
  earnedAchievementCodes,
  guardrailsFor,
  hoursWorked,
  monthKey,
  streakFromLastGamble,
  vaultBalance,
  zonedDayKey,
} from './calculations';
import * as v from './validation';
import { allow } from './rateLimit';
import {
  ACHIEVEMENTS,
  CONSEQUENCE_CATEGORIES,
  GUARDRAIL_SAFE_PCT,
  MOODS,
  URGE_TRIGGERS,
  XP,
} from './constants';
import type {
  AccountabilityType,
  GamblingSession,
  HighRiskWindow,
  RiskOutcome,
} from './types';

const USER_ID = PERSONAL_USER_ID;

const TIME_RE = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MOOD_VALUES = MOODS.map((m) => m.value);
const CONSEQUENCE_VALUES = CONSEQUENCE_CATEGORIES.map((c) => c.value);
const ACCOUNTABILITY_TYPES: AccountabilityType[] = [
  'reason',
  'worst_loss',
  'cost',
];
const URGE_TRIGGER_VALUES = URGE_TRIGGERS.map((t) => t.value);

/** Coerce arbitrary parsed JSON into a clean, storable high-risk window list. */
function sanitizeWindows(raw: unknown): HighRiskWindow[] {
  if (!Array.isArray(raw)) return [];
  const out: HighRiskWindow[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Record<string, unknown>;
    const start = String(w.start ?? '');
    const end = String(w.end ?? '');
    if (!TIME_RE.test(start) || !TIME_RE.test(end) || start === end) continue;
    const days = Array.isArray(w.days)
      ? Array.from(
          new Set(
            w.days
              .map((d) => Number(d))
              .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
          ),
        ).sort((a, b) => a - b)
      : [];
    out.push({
      id: typeof w.id === 'string' && w.id ? w.id : crypto.randomUUID(),
      label: (typeof w.label === 'string' ? w.label : '').trim().slice(0, 60),
      days,
      start,
      end,
    });
    if (out.length >= 12) break; // generous cap, keeps the jsonb bounded
  }
  return out;
}

async function addXp(amount: number) {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', USER_ID)
    .single();
  const current = data?.xp ?? 0;
  await supabase
    .from('profiles')
    .update({ xp: current + amount })
    .eq('id', USER_ID);
}

// ---------------------------------------------------------------------------
// Feature 1: Simple budget setup — monthly income and essential expenses.
// The app derives tiered guardrails (a safe limit + a hard ceiling) from the
// disposable income left after expenses.
// ---------------------------------------------------------------------------
export async function saveBudget(formData: FormData) {
  if (!allow('saveBudget')) return;
  const supabase = createClient();

  const monthlyIncome = v.amount(formData.get('monthly_income'));
  const monthlyExpenses = v.amount(formData.get('monthly_expenses'));
  const spendings = v.amount(formData.get('spendings_balance'));
  const savings = v.amount(formData.get('savings_balance'));
  const offset = v.amount(formData.get('offset_balance'));
  const g = guardrailsFor(monthlyIncome, monthlyExpenses);

  await supabase
    .from('profiles')
    .update({
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
      spendings_balance: spendings,
      savings_balance: savings,
      offset_balance: offset,
    })
    .eq('id', USER_ID);

  // Persist the derived safe limit as this month's allowance so the rest of the
  // app (check-in result, reports) keeps a single coherent number to compare
  // spending against. `max_budget` carries the hard ceiling.
  await supabase.from('monthly_budgets').upsert(
    {
      user_id: USER_ID,
      month: monthKey(),
      disposable_income: g.disposable,
      budget_pct: GUARDRAIL_SAFE_PCT,
      max_budget: g.ceiling,
      recommended_budget: g.safeLimit,
    },
    { onConflict: 'user_id,month' },
  );

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function acknowledgeOverBudget() {
  if (!allow('acknowledgeOverBudget')) return;
  const supabase = createClient();
  await supabase
    .from('monthly_budgets')
    .update({ acknowledged_over: true })
    .eq('user_id', USER_ID)
    .eq('month', monthKey());
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Feature 2 + 10: Log a gambling session
// ---------------------------------------------------------------------------
export async function logGamblingSession(formData: FormData) {
  if (!allow('logGamblingSession')) return;
  const supabase = createClient();

  const amount = v.amount(formData.get('amount'), 1_000_000);
  const venue = v.text(formData.get('venue'), 120);
  const gambledAt = v.timestamp(formData.get('gambled_at'));
  const moodBefore = v.oneOf(formData.get('mood_before'), MOOD_VALUES);
  const moodAfter = v.oneOf(formData.get('mood_after'), MOOD_VALUES);
  const gaveUp = v.oneOf(formData.get('gave_up_category'), CONSEQUENCE_VALUES);

  const { data: profile } = await supabase
    .from('profiles')
    .select('hourly_wage')
    .eq('id', USER_ID)
    .single();
  const wage = profile?.hourly_wage ?? 25;
  const hours = hoursWorked(amount, wage);

  await supabase.from('gambling_sessions').insert({
    user_id: USER_ID,
    amount,
    venue,
    gambled_at: gambledAt,
    mood_before: moodBefore,
    mood_after: moodAfter,
    gave_up_category: gaveUp,
    hours_worked: hours,
  });

  // Update streak: a gamble breaks the current run.
  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', USER_ID)
    .maybeSingle();

  const gambleDate = zonedDayKey(new Date(gambledAt));
  const priorCurrent = streak
    ? streakFromLastGamble(streak.last_gamble_date, new Date(gambledAt))
    : 0;
  const longest = Math.max(streak?.longest_streak ?? 0, priorCurrent);

  await supabase.from('streaks').upsert(
    {
      user_id: USER_ID,
      current_streak: 0,
      longest_streak: longest,
      last_gamble_date: gambleDate,
      streak_start_date: gambleDate,
    },
    { onConflict: 'user_id' },
  );

  await addXp(XP.LOG_SESSION);
  revalidatePath('/', 'layout');
  redirect('/check-in/result?amount=' + encodeURIComponent(String(amount)));
}

// ---------------------------------------------------------------------------
// Daily affirmation: "I didn't gamble today". Purely motivational — the streak
// stays date-based — but it rewards showing up. Awards XP at most once per day.
// ---------------------------------------------------------------------------
export async function logCleanDay() {
  if (!allow('logCleanDay')) return;
  const supabase = createClient();
  const today = dayKey();

  const { data } = await supabase
    .from('profiles')
    .select('last_clean_checkin')
    .eq('id', USER_ID)
    .maybeSingle();

  // Already affirmed today — nothing to do (keeps XP idempotent per day).
  if (data?.last_clean_checkin === today) return;

  await supabase
    .from('profiles')
    .update({ last_clean_checkin: today })
    .eq('id', USER_ID);
  await addXp(XP.GAMBLE_FREE_DAY);
  revalidatePath('/dashboard');
}

// ---------------------------------------------------------------------------
// Features 4 + 5: Recompute streak, vault and achievements (idempotent).
// Safe to call on every dashboard load.
// ---------------------------------------------------------------------------
export async function syncProgress() {
  const supabase = createClient();

  const [{ data: profile }, { data: streak }, { data: sessions }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('daily_vault_amount')
        .eq('id', USER_ID)
        .maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', USER_ID).maybeSingle(),
      supabase
        .from('gambling_sessions')
        .select('gambled_at')
        .eq('user_id', USER_ID),
    ]);

  if (!streak) return;

  const daily = profile?.daily_vault_amount ?? 5;
  const today = new Date();
  const start = streak.streak_start_date
    ? new Date(streak.streak_start_date + 'T00:00:00')
    : today;
  const daysSinceStart = Math.max(
    0,
    Math.floor((today.getTime() - start.getTime()) / 86400000),
  );

  const distinctGamblingDays = new Set(
    ((sessions as Pick<GamblingSession, 'gambled_at'>[]) ?? []).map((s) =>
      zonedDayKey(new Date(s.gambled_at)),
    ),
  ).size;

  const gambleFreeDays = Math.max(0, daysSinceStart - distinctGamblingDays);
  const current = streakFromLastGamble(streak.last_gamble_date, today);
  const effectiveCurrent = streak.last_gamble_date ? current : daysSinceStart;
  const longest = Math.max(streak.longest_streak ?? 0, effectiveCurrent);
  // Recovery Mode (7.2): after a slip the first few gamble-free days earn the
  // vault at a gentler rate, so a slip never wipes the reward to zero.
  const vault = vaultBalance(gambleFreeDays, daily, !!streak.last_gamble_date);

  await supabase
    .from('streaks')
    .update({
      current_streak: effectiveCurrent,
      longest_streak: longest,
      vault_balance: vault,
    })
    .eq('user_id', USER_ID);

  // Unlock any achievements earned at the current streak length.
  const earned = earnedAchievementCodes(effectiveCurrent);
  if (earned.length) {
    const rows = earned.map((code) => ({
      user_id: USER_ID,
      code,
      title: ACHIEVEMENTS.find((a) => a.code === code)?.title ?? code,
    }));
    await supabase
      .from('achievements')
      .upsert(rows, { onConflict: 'user_id,code', ignoreDuplicates: true });
  }
}

// ---------------------------------------------------------------------------
// Feature 8: Accountability wall
// ---------------------------------------------------------------------------
export async function addAccountabilityEntry(formData: FormData) {
  if (!allow('addAccountabilityEntry')) return;
  const supabase = createClient();
  const entryType = v.oneOf(formData.get('entry_type'), ACCOUNTABILITY_TYPES);
  const content = v.text(formData.get('content'), 500);
  if (!entryType || !content) return;
  await supabase.from('accountability_entries').insert({
    user_id: USER_ID,
    entry_type: entryType,
    content,
  });
  await addXp(XP.ACCOUNTABILITY_ENTRY);
  revalidatePath('/accountability');
}

export async function deleteAccountabilityEntry(formData: FormData) {
  if (!allow('deleteAccountabilityEntry')) return;
  const supabase = createClient();
  const id = v.text(formData.get('id'), 64);
  if (!id) return;
  await supabase
    .from('accountability_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID);
  revalidatePath('/accountability');
}

// ---------------------------------------------------------------------------
// Feature 6: Future Self (server-side image upload to Storage)
// ---------------------------------------------------------------------------
export async function saveFutureSelf(formData: FormData) {
  if (!allow('saveFutureSelf')) return;
  const supabase = createClient();
  const caption = v.text(formData.get('caption'), 280);
  const update: Record<string, unknown> = { future_self_caption: caption };

  const file = formData.get('photo') as File | null;
  const isImage = !!file && (file.type || '').startsWith('image/');
  const underLimit = !!file && file.size <= 8 * 1024 * 1024; // 8 MB cap
  if (file && typeof file === 'object' && file.size > 0 && isImage && underLimit) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${USER_ID}/${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from('future-self')
      .upload(path, bytes, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      });
    if (!error) {
      const { data } = supabase.storage.from('future-self').getPublicUrl(path);
      update.future_self_image_url = data.publicUrl;
    }
  }

  await supabase.from('profiles').update(update).eq('id', USER_ID);
  revalidatePath('/', 'layout');
  redirect('/future-self?saved=1');
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export async function saveGoal(formData: FormData) {
  if (!allow('saveGoal')) return;
  const supabase = createClient();
  const id = v.text(formData.get('id'), 64);
  const title = v.text(formData.get('title'), 80);
  const target = v.amount(formData.get('target_amount'));
  const saved = v.amount(formData.get('saved_amount'));
  if (!title) return;

  if (id) {
    await supabase
      .from('savings_goals')
      .update({ title, target_amount: target, saved_amount: saved })
      .eq('id', id)
      .eq('user_id', USER_ID);
  } else {
    const { count } = await supabase
      .from('savings_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', USER_ID);
    await supabase.from('savings_goals').insert({
      user_id: USER_ID,
      title,
      target_amount: target,
      saved_amount: saved,
      is_primary: (count ?? 0) === 0,
    });
  }
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Feature 7: Emergency pause completed
// ---------------------------------------------------------------------------
export async function recordEmergencyPause() {
  if (!allow('recordEmergencyPause')) return;
  await addXp(XP.EMERGENCY_PAUSE_COMPLETED);
  revalidatePath('/dashboard');
}

// ---------------------------------------------------------------------------
// Feature 7.4: Urge tracking — name the craving instead of acting on it.
// Logging an urge (rather than gambling) is the win; we reward the honesty.
// ---------------------------------------------------------------------------
export async function logUrge(formData: FormData) {
  if (!allow('logUrge')) return;
  const supabase = createClient();

  const intensity = v.clamp(
    Math.round(v.toNumber(formData.get('intensity'))),
    0,
    10,
  );
  const trigger = v.oneOf(formData.get('trigger'), URGE_TRIGGER_VALUES);
  const note = v.text(formData.get('note'), 500);
  // A slip records its own session; an urge log defaults to "rode it out".
  const resisted = formData.get('resisted') !== 'false';

  await supabase.from('urge_logs').insert({
    user_id: USER_ID,
    intensity,
    trigger,
    note,
    resisted,
  });

  await addXp(XP.LOG_URGE);
  revalidatePath('/', 'layout');
  redirect('/urge?logged=1');
}

// ---------------------------------------------------------------------------
// Feature 7.1: Pre-commitment risk gate — record what the person chose when the
// gate fired. 'safe' earns a little XP; 'paused' flows into the Emergency Pause
// (which awards its own XP on completion).
// ---------------------------------------------------------------------------
export async function recordRiskEvent(outcome: RiskOutcome) {
  if (outcome !== 'safe' && outcome !== 'paused' && outcome !== 'support') return;
  if (!allow('recordRiskEvent')) return;
  const supabase = createClient();
  await supabase
    .from('risk_events')
    .insert({ user_id: USER_ID, outcome });
  if (outcome === 'safe') await addXp(XP.RISK_GATE_SAFE);
  revalidatePath('/', 'layout');
}

export async function saveRiskSettings(formData: FormData) {
  if (!allow('saveRiskSettings')) return;
  const supabase = createClient();

  const enabled = formData.get('risk_gate_enabled') === 'on';
  const phone = v.text(formData.get('support_phone'), 40);

  let parsed: unknown = [];
  try {
    parsed = JSON.parse((formData.get('high_risk_windows') as string) || '[]');
  } catch {
    parsed = [];
  }
  const windows = sanitizeWindows(parsed);

  await supabase
    .from('profiles')
    .update({
      risk_gate_enabled: enabled,
      support_phone: phone,
      high_risk_windows: windows,
    })
    .eq('id', USER_ID);

  revalidatePath('/', 'layout');
  redirect('/settings?saved=1#risk-gate');
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSettings(formData: FormData) {
  if (!allow('updateSettings')) return;
  const supabase = createClient();
  const fullName = v.text(formData.get('full_name'), 80);
  const hourlyWage = v.clamp(v.toNumber(formData.get('hourly_wage'), 25), 0, 100_000);
  const dailyVault = v.clamp(
    v.toNumber(formData.get('daily_vault_amount'), 5),
    0,
    100_000,
  );
  const consequenceMode = formData.get('consequence_mode') === 'on';

  await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      hourly_wage: hourlyWage,
      daily_vault_amount: dailyVault,
      consequence_mode: consequenceMode,
    })
    .eq('id', USER_ID);
  revalidatePath('/', 'layout');
  redirect('/settings?saved=1');
}
