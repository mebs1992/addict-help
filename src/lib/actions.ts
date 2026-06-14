'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { PERSONAL_USER_ID } from './config';
import {
  earnedAchievementCodes,
  guardrailsFor,
  hoursWorked,
  monthKey,
  streakFromLastGamble,
} from './calculations';
import { ACHIEVEMENTS, GUARDRAIL_SAFE_PCT, XP } from './constants';
import type { GamblingSession } from './types';

const USER_ID = PERSONAL_USER_ID;

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
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
  const supabase = createClient();

  const monthlyIncome = num(formData.get('monthly_income'));
  const monthlyExpenses = num(formData.get('monthly_expenses'));
  const g = guardrailsFor(monthlyIncome, monthlyExpenses);

  await supabase
    .from('profiles')
    .update({
      monthly_income: monthlyIncome,
      monthly_expenses: monthlyExpenses,
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
  const supabase = createClient();

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

  const gambleDate = gambledAt.slice(0, 10);
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
  const supabase = createClient();
  const entryType = formData.get('entry_type') as string;
  const content = ((formData.get('content') as string) || '').trim();
  if (!content) return;
  await supabase.from('accountability_entries').insert({
    user_id: USER_ID,
    entry_type: entryType,
    content,
  });
  await addXp(XP.ACCOUNTABILITY_ENTRY);
  revalidatePath('/accountability');
}

export async function deleteAccountabilityEntry(formData: FormData) {
  const supabase = createClient();
  const id = formData.get('id') as string;
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
  const supabase = createClient();
  const caption = (formData.get('caption') as string) || null;
  const update: Record<string, unknown> = { future_self_caption: caption };

  const file = formData.get('photo') as File | null;
  if (file && typeof file === 'object' && file.size > 0) {
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
  const supabase = createClient();
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
  await addXp(XP.EMERGENCY_PAUSE_COMPLETED);
  revalidatePath('/dashboard');
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------
export async function updateSettings(formData: FormData) {
  const supabase = createClient();
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
    .eq('id', USER_ID);
  revalidatePath('/', 'layout');
  redirect('/settings?saved=1');
}
