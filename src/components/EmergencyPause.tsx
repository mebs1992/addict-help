'use client';

import { useEffect, useRef, useState } from 'react';
import { EMERGENCY_PAUSE_SECONDS } from '@/lib/constants';
import { recordEmergencyPause } from '@/lib/actions';
import { money } from '@/lib/calculations';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const BREATHS = [
  'Breathe in for 4… hold… out for 6.',
  'This urge is a wave. It rises, it peaks, it passes.',
  'You have been here before and you got through it.',
  'Nothing has to happen in the next ten minutes.',
];

export function EmergencyPause({
  monthlyLosses,
  currentStreak,
  goalTitle,
  goalSaved,
  goalTarget,
  reasons,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: {
  monthlyLosses: number;
  currentStreak: number;
  goalTitle: string | null;
  goalSaved: number;
  goalTarget: number;
  reasons: string[];
  /** Controlled open state. When provided, the component is driven externally. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in "I feel like gambling" trigger button. */
  hideTrigger?: boolean;
}) {
  const [openState, setOpenState] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (!isControlled) setOpenState(next);
    onOpenChange?.(next);
  };
  const [remaining, setRemaining] = useState(EMERGENCY_PAUSE_SECONDS);
  const [breath, setBreath] = useState(0);
  const recorded = useRef(false);

  useEffect(() => {
    if (!open) return;
    setRemaining(EMERGENCY_PAUSE_SECONDS);
    recorded.current = false;
    const t = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    const b = setInterval(() => setBreath((i) => (i + 1) % BREATHS.length), 5000);
    return () => {
      clearInterval(t);
      clearInterval(b);
    };
  }, [open]);

  useEffect(() => {
    if (open && remaining === 0 && !recorded.current) {
      recorded.current = true;
      recordEmergencyPause().catch(() => {});
    }
  }, [remaining, open]);

  const done = remaining === 0;
  const goalPct =
    goalTarget > 0 ? Math.min(100, (goalSaved / goalTarget) * 100) : 0;

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="btn w-full animate-pulse-ring bg-danger-600 py-4 text-base text-white hover:bg-danger-500"
        >
          🆘 I Feel Like Gambling
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink-950/97 p-5 backdrop-blur">
          <div className="mx-auto w-full max-w-md space-y-4 py-6">
            <div className="text-center">
              <p className="muted">Take a breath. Stay with this for</p>
              <p className="my-2 text-6xl font-bold tabular-nums text-brand-400">
                {fmt(remaining)}
              </p>
              <p className="min-h-[2.5rem] text-base text-slate-200">
                {BREATHS[breath]}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="card-tight">
                <p className="muted">This month you&apos;ve lost</p>
                <p className="stat text-danger-400">{money(monthlyLosses)}</p>
              </div>
              <div className="card-tight">
                <p className="muted">Current streak</p>
                <p className="stat text-brand-400">{currentStreak}d</p>
              </div>
            </div>

            {goalTitle && (
              <div className="card-tight">
                <p className="muted">You are saving for</p>
                <p className="font-semibold text-slate-100">{goalTitle}</p>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${goalPct}%` }}
                  />
                </div>
                <p className="muted mt-1">
                  {money(goalSaved)} of {money(goalTarget)} — a gamble now sets
                  this back.
                </p>
              </div>
            )}

            {reasons.length > 0 && (
              <div className="card-tight">
                <p className="muted mb-2">Why you wanted to stop</p>
                <ul className="space-y-2">
                  {reasons.map((r, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-white/5 bg-white/5 p-3 text-sm text-slate-200"
                    >
                      “{r}”
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {done ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4 text-center text-brand-400">
                  The urge passed and you stayed in control. +50 XP.
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="btn-primary w-full py-4"
                >
                  I&apos;m okay now
                </button>
              </div>
            ) : (
              <button
                disabled
                className="btn w-full cursor-not-allowed border border-white/10 bg-white/5 py-4 text-slate-500"
              >
                Please wait — the timer is protecting you
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
