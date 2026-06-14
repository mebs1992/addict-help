'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { logGamblingSession } from '@/lib/actions';
import { CONSEQUENCE_CATEGORIES, MOODS } from '@/lib/constants';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn-primary w-full py-3.5" disabled={pending}>
      {pending ? 'Logging…' : 'Log it honestly'}
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
}: {
  consequenceMode: boolean;
  defaultDateTime: string;
}) {
  const [gaveUp, setGaveUp] = useState('');

  return (
    <form action={logGamblingSession} className="card space-y-5">
      <div>
        <label className="label" htmlFor="amount">
          Amount spent
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

      <p className="muted">
        There&apos;s no judgement here. Logging honestly is a win in itself —
        you&apos;ll earn XP for it.
      </p>

      <SubmitButton />
    </form>
  );
}
