'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { logGamblingSession } from '@/lib/actions';
import { CONSEQUENCE_CATEGORIES, INVEST_YEARS, MOODS } from '@/lib/constants';
import {
  closestOpportunity,
  hoursWorked,
  investedFutureValue,
  money,
  opportunityBreakdown,
} from '@/lib/calculations';
import { EmergencyPause } from '@/components/EmergencyPause';

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

export function CheckInForm({
  consequenceMode,
  defaultDateTime,
  hourlyWage,
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
  const futureValue = investedFutureValue(amountNum);
  const breakdown = opportunityBreakdown(amountNum, 3);
  const closest = closestOpportunity(amountNum);

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
            See what this really costs →
          </button>
          <p className="muted text-center">
            We&apos;ll show you the real cost before anything is logged.
          </p>
        </div>

        {/* Step 2: the pre-confirmation simulation. */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="muted">You&apos;re about to spend</p>
              <p className="text-4xl font-bold text-danger-400">
                {money(amountNum)}
              </p>
            </div>

            <div className="space-y-3">
              <div className="card-tight">
                <p className="muted">That&apos;s</p>
                <p className="text-2xl font-bold text-warn-400">
                  {hours.toFixed(1)} hours
                </p>
                <p className="muted">of your life at work.</p>
              </div>

              <div className="card-tight">
                <p className="muted">
                  Invested monthly for {INVEST_YEARS} years it could become
                </p>
                <p className="text-2xl font-bold text-brand-400">
                  {money(futureValue)}
                </p>
              </div>

              {breakdown.length > 0 ? (
                <div className="card-tight">
                  <p className="muted mb-2">It could buy instead</p>
                  <ul className="space-y-1.5">
                    {breakdown.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="text-lg">{item.emoji}</span>
                        <span className="font-medium">
                          {item.quantity} × {item.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                closest && (
                  <div className="card-tight">
                    <p className="muted">That&apos;s about</p>
                    <p className="text-lg font-semibold">
                      {closest.emoji} one {closest.label}
                    </p>
                  </div>
                )
              )}
            </div>

            <p className="muted text-center">
              Nothing has happened yet. You can still walk away.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPauseOpen(true)}
                className="btn-primary w-full py-3.5"
              >
                ⏳ Pause 10 minutes first
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
