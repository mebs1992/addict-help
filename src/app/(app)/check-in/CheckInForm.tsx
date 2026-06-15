'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { logGamblingSession } from '@/lib/actions';
import { CONSEQUENCE_CATEGORIES, IMPACT_LABELS, MOODS } from '@/lib/constants';
import {
  calculateImpactScore,
  closestOpportunity,
  hoursWorked,
  money,
  opportunityBreakdown,
} from '@/lib/calculations';
import type { ImpactLevel } from '@/lib/types';
import { EmergencyPause } from '@/components/EmergencyPause';

const IMPACT_TEXT: Record<ImpactLevel, string> = {
  low: 'text-brand-400',
  moderate: 'text-warn-400',
  high: 'text-danger-400',
  severe: 'text-danger-400',
};
const IMPACT_PILL: Record<ImpactLevel, string> = {
  low: 'bg-brand-500/20 text-brand-400',
  moderate: 'bg-warn-500/20 text-warn-400',
  high: 'bg-danger-500/20 text-danger-400',
  severe: 'bg-danger-500/30 text-danger-400',
};

function ProceedButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-danger w-full py-3.5" disabled={pending}>
      {pending ? 'Logging…' : 'Proceed anyway — log it honestly'}
    </button>
  );
}

function MoodGrid({ name, label }: { name: string; label: string }) {
  const [selected, setSelected] = useState<string>('');
  return (
    <div>
      <p className="label">{label}</p>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <button
            type="button"
            key={m.value}
            onClick={() => setSelected(m.value)}
            className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 text-[10px] transition ${
              selected === m.value
                ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                : 'border-white/10 bg-white/5 text-slate-400'
            }`}
          >
            <span className="text-lg">{m.emoji}</span>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MirrorRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger' | 'warn' | 'brand';
}) {
  const cls =
    tone === 'danger'
      ? 'text-danger-400'
      : tone === 'warn'
        ? 'text-warn-400'
        : tone === 'brand'
          ? 'text-brand-400'
          : 'text-slate-100';
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="muted">{label}</span>
      <span className={`text-right font-semibold ${cls}`}>{value}</span>
    </div>
  );
}

export function CheckInForm({
  consequenceMode,
  defaultDateTime,
  hourlyWage,
  monthlySurplus,
  daysSinceLastGamble,
  inRecovery,
  recoveryDay,
  recoveryDaysLeft,
  recentUrges,
  avgLoss,
  biggestLoss,
  thisMonthTotal,
  prevMonthlyAvg,
  monthlyLosses,
  currentStreak,
  goalTitle,
  goalSaved,
  goalTarget,
  reasons,
}: {
  consequenceMode: boolean;
  defaultDateTime: string;
  hourlyWage: number;
  monthlySurplus: number;
  daysSinceLastGamble: number | null;
  inRecovery: boolean;
  recoveryDay: number;
  recoveryDaysLeft: number;
  recentUrges: number;
  avgLoss: number;
  biggestLoss: number;
  thisMonthTotal: number;
  prevMonthlyAvg: number;
  monthlyLosses: number;
  currentStreak: number;
  goalTitle: string | null;
  goalSaved: number;
  goalTarget: number;
  reasons: string[];
}) {
  const [gaveUp, setGaveUp] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  const [pauseOpen, setPauseOpen] = useState(false);

  const amountNum = Math.max(0, parseFloat(amount) || 0);
  const hours = hoursWorked(amountNum, hourlyWage);
  const breakdown = opportunityBreakdown(amountNum, 3);
  const closest = closestOpportunity(amountNum);
  const impact = calculateImpactScore(amountNum, monthlySurplus);

  const goalRemaining = Math.max(0, goalTarget - goalSaved);
  const goalImpactPct =
    goalRemaining > 0 ? (amountNum / goalRemaining) * 100 : null;

  const trendDelta = thisMonthTotal + amountNum - prevMonthlyAvg;

  return (
    <>
      <form action={logGamblingSession} className="card space-y-5">
        {/* Step 1 inputs stay mounted (so their values submit) — hidden in step 2. */}
        <div className={step === 1 ? 'space-y-5' : 'hidden'}>
          <div>
            <label className="label" htmlFor="amount">
              Amount about to spend
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                $
              </span>
              <input
                id="amount"
                name="amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input pl-8 text-2xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="venue">
                Venue
              </label>
              <input
                id="venue"
                name="venue"
                type="text"
                placeholder="Local RSL"
                className="input"
              />
            </div>
            <div>
              <label className="label" htmlFor="gambled_at">
                When
              </label>
              <input
                id="gambled_at"
                name="gambled_at"
                type="datetime-local"
                defaultValue={defaultDateTime}
                className="input"
              />
            </div>
          </div>

          <MoodGrid name="mood_before" label="Mood before" />
          <MoodGrid name="mood_after" label="Mood after" />

          {consequenceMode && (
            <div className="rounded-xl border border-warn-500/30 bg-warn-500/10 p-4">
              <p className="label text-warn-400">
                Consequence Mode — what did this money give up?
              </p>
              <input type="hidden" name="gave_up_category" value={gaveUp} />
              <div className="grid grid-cols-4 gap-2">
                {CONSEQUENCE_CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setGaveUp(c.value)}
                    className={`flex flex-col items-center gap-0.5 rounded-xl border p-2 text-[10px] transition ${
                      gaveUp === c.value
                        ? 'border-warn-500 bg-warn-500/20 text-warn-400'
                        : 'border-white/10 bg-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-lg">{c.emoji}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              if (amountNum > 0) setStep(2);
            }}
            disabled={amountNum <= 0}
            className="btn-primary w-full py-3.5 disabled:opacity-50"
          >
            See what this really means →
          </button>
          <p className="muted text-center">
            We&apos;ll show you the full picture before anything is logged.
          </p>
        </div>

        {/* Step 2: the Decision Mirror — financial, behavioural and historical
            context shown before anything is committed. */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="muted">You&apos;re about to spend</p>
              <p className="text-4xl font-bold text-danger-400">
                {money(amountNum)}
              </p>
            </div>

            {/* Financial impact */}
            <div className="card-tight">
              <div className="flex items-center justify-between">
                <p className="label mb-0">Financial impact</p>
                <span className={`pill ${IMPACT_PILL[impact.level]}`}>
                  {IMPACT_LABELS[impact.level]}
                </span>
              </div>
              <p className={`mt-2 text-2xl font-bold ${IMPACT_TEXT[impact.level]}`}>
                {impact.ratioPct === null
                  ? 'No surplus to draw from'
                  : `${impact.ratioPct.toFixed(1)}% of your surplus`}
              </p>
              <p className="muted mt-1">
                {impact.ratioPct === null
                  ? 'You have no monthly surplus after essentials — this comes straight out of the things you need.'
                  : `This represents ${impact.ratioPct.toFixed(
                      1,
                    )}% of your monthly surplus after essential expenses.`}
              </p>
              <div className="mt-3 border-t border-white/5 pt-2">
                <MirrorRow
                  label="Hours of your life at work"
                  value={`${hours.toFixed(1)} hrs`}
                  tone="warn"
                />
                {goalImpactPct !== null && goalTitle && (
                  <MirrorRow
                    label={`Toward "${goalTitle}"`}
                    value={`${goalImpactPct.toFixed(0)}% of what's left`}
                    tone="brand"
                  />
                )}
                {breakdown.length > 0 ? (
                  <MirrorRow
                    label="Could buy instead"
                    value={breakdown
                      .map((b) => `${b.quantity} ${b.label}`)
                      .join(', ')}
                  />
                ) : (
                  closest && (
                    <MirrorRow
                      label="About the same as"
                      value={`one ${closest.label}`}
                    />
                  )
                )}
              </div>
            </div>

            {/* Behavioural context */}
            <div className="card-tight">
              <p className="label">Behavioural context</p>
              <MirrorRow
                label="Days since last session"
                value={
                  daysSinceLastGamble === null
                    ? 'none logged'
                    : `${daysSinceLastGamble} days`
                }
                tone="brand"
              />
              <MirrorRow
                label="Urges logged (last 7 days)"
                value={`${recentUrges}`}
              />
              {inRecovery && (
                <MirrorRow
                  label="Recovery mode"
                  value={`Day ${recoveryDay} · ${recoveryDaysLeft}d left`}
                  tone="warn"
                />
              )}
            </div>

            {/* Historical context */}
            {(avgLoss > 0 || biggestLoss > 0) && (
              <div className="card-tight">
                <p className="label">Historical context</p>
                <MirrorRow
                  label="Your average session"
                  value={money(avgLoss)}
                />
                <MirrorRow
                  label="Your biggest single loss"
                  value={money(biggestLoss)}
                  tone="danger"
                />
                {prevMonthlyAvg > 0 && (
                  <MirrorRow
                    label="This month vs recent average"
                    value={
                      trendDelta > 0
                        ? `↑ ${money(Math.abs(trendDelta))} above`
                        : `↓ ${money(Math.abs(trendDelta))} below`
                    }
                    tone={trendDelta > 0 ? 'danger' : 'brand'}
                  />
                )}
              </div>
            )}

            <p className="muted text-center">
              Nothing has happened yet. Walking away preserves{' '}
              <span className="font-semibold text-brand-400">
                {money(amountNum)}
              </span>
              .
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPauseOpen(true)}
                className="btn-primary w-full py-3.5"
              >
                ⏳ Start a 10-minute pause
              </button>
              <Link href="/urge" className="btn-ghost w-full py-3.5">
                🌊 Log the urge instead (no money spent)
              </Link>
              <ProceedButton />
              <button
                type="button"
                onClick={() => setStep(1)}
                className="muted block w-full text-center"
              >
                ← Back to edit
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Sibling of the form so its buttons never submit the check-in. */}
      <EmergencyPause
        hideTrigger
        open={pauseOpen}
        onOpenChange={setPauseOpen}
        monthlyLosses={monthlyLosses}
        currentStreak={currentStreak}
        goalTitle={goalTitle}
        goalSaved={goalSaved}
        goalTarget={goalTarget}
        reasons={reasons}
      />
    </>
  );
}
