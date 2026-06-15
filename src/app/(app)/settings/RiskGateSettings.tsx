'use client';

import { useState } from 'react';
import { saveRiskSettings } from '@/lib/actions';
import { DEFAULT_SUPPORT_LABEL } from '@/lib/constants';
import type { HighRiskWindow } from '@/lib/types';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function newWindow(): HighRiskWindow {
  return {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
    label: '',
    days: [5, 6], // Friday + Saturday — the classic pokies window
    start: '18:00',
    end: '23:00',
  };
}

export function RiskGateSettings({
  enabled,
  supportPhone,
  windows: initialWindows,
}: {
  enabled: boolean;
  supportPhone: string | null;
  windows: HighRiskWindow[];
}) {
  const [windows, setWindows] = useState<HighRiskWindow[]>(initialWindows);

  const update = (id: string, patch: Partial<HighRiskWindow>) =>
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));

  const toggleDay = (id: string, day: number) =>
    setWindows((ws) =>
      ws.map((w) =>
        w.id === id
          ? {
              ...w,
              days: w.days.includes(day)
                ? w.days.filter((d) => d !== day)
                : [...w.days, day].sort((a, b) => a - b),
            }
          : w,
      ),
    );

  return (
    <form action={saveRiskSettings} className="card space-y-4" id="risk-gate">
      <div>
        <h2 className="font-semibold">Pre-commitment risk gate</h2>
        <p className="muted mt-1">
          During the times you flag below, the app locks itself and offers only
          three choices: wait it out, take a 10-minute pause, or call for help.
        </p>
      </div>

      <input type="hidden" name="high_risk_windows" value={JSON.stringify(windows)} />

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <input
          type="checkbox"
          name="risk_gate_enabled"
          defaultChecked={enabled}
          className="mt-1 h-5 w-5 accent-brand-500"
        />
        <span>
          <span className="block font-medium">Turn the gate on</span>
          <span className="muted">
            Needs at least one high-risk time below to do anything.
          </span>
        </span>
      </label>

      <div className="space-y-3">
        {windows.length === 0 && (
          <p className="muted">No high-risk times yet. Add one below.</p>
        )}
        {windows.map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={w.label}
                onChange={(e) => update(w.id, { label: e.target.value })}
                placeholder="Name it (e.g. Friday nights)"
                className="input py-2 text-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setWindows((ws) => ws.filter((x) => x.id !== w.id))
                }
                aria-label="Remove this time"
                className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-slate-400 hover:text-danger-400"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, day) => (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(w.id, day)}
                  className={`h-9 w-9 rounded-lg border text-xs font-medium transition ${
                    w.days.includes(day)
                      ? 'border-brand-500 bg-brand-500/20 text-brand-300'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <input
                type="time"
                value={w.start}
                onChange={(e) => update(w.id, { start: e.target.value })}
                className="input py-2"
              />
              <span className="muted">to</span>
              <input
                type="time"
                value={w.end}
                onChange={(e) => update(w.id, { end: e.target.value })}
                className="input py-2"
              />
            </div>
            <p className="muted text-xs">
              {w.days.length === 0
                ? 'Every day'
                : w.days.map((d) => DAY_LABELS[d]).join(' · ')}{' '}
              · {w.start}–{w.end}
            </p>
          </div>
        ))}

        <button
          type="button"
          onClick={() => setWindows((ws) => [...ws, newWindow()])}
          className="btn-ghost w-full py-2.5 text-sm"
        >
          + Add a high-risk time
        </button>
      </div>

      <div>
        <label className="label" htmlFor="support_phone">
          Support number to call
        </label>
        <input
          id="support_phone"
          name="support_phone"
          type="tel"
          defaultValue={supportPhone ?? ''}
          placeholder={DEFAULT_SUPPORT_LABEL}
          className="input"
        />
        <p className="muted mt-1 text-xs">
          Leave blank to use {DEFAULT_SUPPORT_LABEL}.
        </p>
      </div>

      <button className="btn-primary w-full py-3">Save risk gate</button>
    </form>
  );
}
