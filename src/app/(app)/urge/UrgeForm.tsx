'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { logUrge } from '@/lib/actions';
import { URGE_TRIGGERS } from '@/lib/constants';

function intensityLabel(value: number): string {
  if (value <= 2) return 'Barely there';
  if (value <= 5) return 'Noticeable';
  if (value <= 7) return 'Strong';
  return 'Overwhelming';
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full py-3.5" disabled={pending}>
      {pending ? 'Logging…' : 'I rode it out'}
    </button>
  );
}

export function UrgeForm() {
  const [intensity, setIntensity] = useState(5);
  const [trigger, setTrigger] = useState('');

  const tone =
    intensity <= 2
      ? 'text-brand-400'
      : intensity <= 5
        ? 'text-warn-400'
        : 'text-danger-400';

  return (
    <form action={logUrge} className="card space-y-5">
      {/* An urge logged is an urge resisted — slips are logged as sessions. */}
      <input type="hidden" name="resisted" value="true" />

      <div>
        <div className="flex items-baseline justify-between">
          <label className="label mb-0" htmlFor="intensity">
            How strong is it?
          </label>
          <span className={`text-2xl font-bold tabular-nums ${tone}`}>
            {intensity}
            <span className="text-sm text-slate-500">/10</span>
          </span>
        </div>
        <input
          id="intensity"
          name="intensity"
          type="range"
          min="0"
          max="10"
          step="1"
          value={intensity}
          onChange={(e) => setIntensity(Number(e.target.value))}
          className="mt-3 w-full accent-brand-500"
        />
        <p className={`mt-1 text-sm font-medium ${tone}`}>
          {intensityLabel(intensity)}
        </p>
      </div>

      <div>
        <p className="label">What&apos;s driving it?</p>
        <input type="hidden" name="trigger" value={trigger} />
        <div className="grid grid-cols-3 gap-2">
          {URGE_TRIGGERS.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setTrigger(trigger === t.value ? '' : t.value)}
              className={`flex flex-col items-center gap-0.5 rounded-xl border p-2.5 text-[11px] transition ${
                trigger === t.value
                  ? 'border-brand-500 bg-brand-500/15 text-brand-300'
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="note">
          Anything you want to remember? (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          placeholder="Where you were, what helped…"
          className="input resize-none"
        />
      </div>

      <p className="muted">
        Naming an urge instead of acting on it is a real win — and it earns you
        XP. The more you log, the better the app learns your patterns.
      </p>

      <SubmitButton />
    </form>
  );
}
