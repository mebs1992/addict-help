'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import {
  disposableIncome,
  earnedAchievementCodes,
  hoursWorked,
  monthKey,
  recommendedBudget,
  streakFromLastGamble,
} from './calculations';
import { ACHIEVEMENTS, XP } from './constants';
import type { GamblingSession } from './types';

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

async function addXp(amount: number) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', user.id)
    .single();
  const current = data?.xp ?? 0;
  await supabase
    .from('profiles')
    .update({ xp: current + amount })
    .eq('id', user.id);
}

// ---------------------------------------------------------------------------
// Feature 1: Budget setup
// ---------------------------------------------------------------------------
export async function saveBudget(formData: FormData) {
  const { supabase, user } = await requireUser();

  const annualIncome = num(formData.get('annual_income'));
  const monthlyExpenses = num(formData.get('monthly_expenses'));
  const hourlyWage = num(formData.get('hourly_wage'), 25);
  const budgetPct = num(formData.get('budget_pct'), 1);
  const maxBudgetRaw = formData.get('max_budget');
  const maxBudget =
    maxBudgetRaw && String(maxBudgetRaw).trim() !== ''
      ? num(maxBudgetRaw)
      : null;
  const savingsTarget = num(formData.get('savings_target'));

  await supabase
    .from('profiles')
    .update({
      annual_income: annualIncome,
      monthly_expenses: monthlyExpenses,
      hourly_wage: hourlyWage,
    })
    .eq('id', user.id);

  const disposable = disposableIncome(annualIncome, monthlyExpenses);
  const recommended = recommendedBudget(disposable, budgetPct, maxBudget);

  await supabase.from('monthly_budgets').upsert(
    {
      user_id: user.id,
      month: monthKey(),
      disposable_income: disposable,
      budget_pct: budgetPct,
      max_budget: maxBudget,
      recommended_budget: recommended,
    },
    { onConflict: 'user_id,month' },
  );

  if (savingsTarget > 0) {
    const { data: existing } = await supabase
      .from('savings_goals')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle();
    if (existing) {
      await supabase
        .from('savings_goals')
        .update({ target_amount: savingsTarget })
        .eq('id', existing.id);
    } else {
      await supabase.from('savings_goals').insert({
        user_id: user.id,
        title: 'My savings goal',
        target_amount: savingsTarget,
        is_primary: true,
      });
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function acknowledgeOverBudget() {
  const { supabase, user } = await requireUser();
  await supabase
    .from('monthly_budgets')
    .update({ acknowledged_over: true })
    .eq('user_id', user.id)
    .eq('month', monthKey());
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Feature 2 + 10: Log a gambling session
// ---------------------------------------------------------------------------
export async function logGamblingSession(formData: FormData) {
  const { supabase, user } = await requireUser();

  const amount = num(formData.get('amount'));
  const venue = (formData.get('venue') as string) || null;
  const gambledAtRaw = formData.get('gambled_at') as string;
  const gambledAt = gambledAtRaw
    ? new Date(gambledAtRaw).toISOString()
    : new Date().toISOString();
  const moodBefore = (formData.get('mood_before') as string) || null;
  const moodAfter = (formData.get('mood_after') as string) || null;
  const gaveUp = (formData.get('gave_up_category') as string) || null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('hourly_wage')
    .eq('id', user.id)
    .single();
  const wage = profile?.hourly_wage ?? 25;
  const hours = hoursWorked(amount, wage);

  await supabase.from('gambling_sessions').insert({
    user_id: user.id,
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
    .eq('user_id', user.id)
    .maybeSingle();

  const gambleDate = gambledAt.slice(0, 10);
  const priorCurrent = streak
    ? streakFromLastGamble(streak.last_gamble_date, new Date(gambledAt))
    : 0;
  const longest = Math.max(streak?.longest_streak ?? 0, priorCurrent);

  await supabase.from('streaks').upsert(
    {
      user_id: user.id,
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
// Features 4 + 5: Recompute streak, vault and achievements (idempotent).
// Safe to call on every dashboard load.
// ---------------------------------------------------------------------------
export async function syncProgress() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const [{ data: profile }, { data: streak }, { data: sessions }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('daily_vault_amount')
        .eq('id', user.id)
        .maybeSingle(),
      supabase.from('streaks').select('*').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('gambling_sessions')
        .select('gambled_at')
        .eq('user_id', user.id),
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
      new Date(s.gambled_at).toISOString().slice(0, 10),
    ),
  ).size;

  const gambleFreeDays = Math.max(0, daysSinceStart - distinctGamblingDays);
  const current = streakFromLastGamble(streak.last_gamble_date, today);
  const effectiveCurrent = streak.last_gamble_date ? current : daysSinceStart;
  const longest = Math.max(streak.longest_streak ?? 0, effectiveCurrent);
  const vault = gambleFreeDays * daily;

  await supabase
    .from('streaks')
    .update({
      current_streak: effectiveCurrent,
      longest_streak: longest,
      vault_balance: vault,
    })
    .eq('user_id', user.id);

  // Unlock any achievements earned at the current streak length.
  const earned = earnedAchievementCodes(effectiveCurrent);
  if (earned.length) {
    const rows = earned.map((code) => ({
      user_id: user.id,
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
  const { supabase, user } = await requireUser();
  const entryType = formData.get('entry_type') as string;
  const content = ((formData.get('content') as string) || '').trim();
  if (!content) return;
  await supabase.from('accountability_entries').insert({
    user_id: user.id,
    entry_type: entryType,
    content,
  });
  await addXp(XP.ACCOUNTABILITY_ENTRY);
  revalidatePath('/accountability');
}

export async function deleteAccountabilityEntry(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = formData.get('id') as string;
  await supabase
    .from('accountability_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  revalidatePath('/accountability');
}

// ---------------------------------------------------------------------------
// Feature 6: Future Self
// ---------------------------------------------------------------------------
export async function saveFutureSelf(formData: FormData) {
  const { supabase, user } = await requireUser();
  const caption = (formData.get('caption') as string) || null;
  const imageUrl = (formData.get('image_url') as string) || null;
  const update: Record<string, unknown> = { future_self_caption: caption };
  if (imageUrl) update.future_self_image_url = imageUrl;
  await supabase.from('profiles').update(update).eq('id', user.id);
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
export async function saveGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = (formData.get('id') as string) || null;
  const title = ((formData.get('title') as string) || '').trim();
  const target = num(formData.get('target_amount'));
  const saved = num(formData.get('saved_amount'));
  if (!title) return;

  if (id) {
    await supabase
      .from('savings_goals')
      .update({ title, target_amount: target, saved_amount: saved })
      .eq('id', id)
      .eq('user_id', user.id);
  } else {
    const { count } = await supabase
      .from('savings_goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    await supabase.from('savings_goals').insert({
      user_id: user.id,
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
  await addXp(XP.EMERGENCY_PAUSE_COMPLETED);
  revalidatePath('/dashboard');
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSettings(formData: FormData) {
  const { supabase, user } = await requireUser();
  const fullName = (formData.get('full_name') as string) || null;
  const hourlyWage = num(formData.get('hourly_wage'), 25);
  const dailyVault = num(formData.get('daily_vault_amount'), 5);
  const consequenceMode = formData.get('consequence_mode') === 'on';

  await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      hourly_wage: hourlyWage,
      daily_vault_amount: dailyVault,
      consequence_mode: consequenceMode,
    })
    .eq('id', user.id);
  revalidatePath('/', 'layout');
  redirect('/settings?saved=1');
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
