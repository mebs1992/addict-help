'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SUPPORT_LABEL,
  DEFAULT_SUPPORT_PHONE,
  RISK_GATE_REPRIEVE_MINUTES,
  RISK_GATE_SAFE_DELAY_SECONDS,
} from '@/lib/constants';
import { recordRiskEvent } from '@/lib/actions';
import { activeRiskWindow } from '@/lib/calculations';
import type { HighRiskWindow } from '@/lib/types';
import { EmergencyPause } from './EmergencyPause';

const REPRIEVE_KEY = 'cofs:risk-gate-clear-until';

function reprieveActive(): boolean {
  try {
    const until = Number(localStorage.getItem(REPRIEVE_KEY) || '0');
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

function setReprieve() {
  try {
    localStorage.setItem(
      REPRIEVE_KEY,
      String(Date.now() + RISK_GATE_REPRIEVE_MINUTES * 60_000),
    );
  } catch {
    /* private mode — fall back to in-memory dismissal via state */
  }
}

/**
 * Full-screen pre-commitment gate. While the device clock sits inside one of the
 * user's high-risk windows, it takes over the whole app: the only ways forward
 * are a delayed "I'm safe", a 10-minute pause, or calling support. There is no
 * dashboard access until one of those is chosen.
 */
export function RiskGate({
  windows,
  supportPhone,
  monthlyLosses,
  currentStreak,
  goalTitle,
  goalSaved,
  goalTarget,
  reasons,
}: {
  windows: HighRiskWindow[];
  supportPhone: string | null;
  monthlyLosses: number;
  currentStreak: number;
  goalTitle: string | null;
  goalSaved: number;
  goalTarget: number;
  reasons: string[];
}) {
  const [active, setActive] = useState<HighRiskWindow | null>(null);
  const [pauseOpen, setPauseOpen] = useState(false);
  const [delay, setDelay] = useState(RISK_GATE_SAFE_DELAY_SECONDS);

  const phone = supportPhone || DEFAULT_SUPPORT_PHONE;
  const phoneLabel = supportPhone
    ? `Call ${supportPhone}`
    : DEFAULT_SUPPORT_LABEL;

  // Re-evaluate the clock on mount and every 30s. Skips while paused (the pause
  // owns the screen) or during a reprieve.
  const evaluate = useCallback(() => {
    if (pauseOpen) return;
    if (reprieveActive()) {
      setActive(null);
      return;
    }
    setActive(activeRiskWindow(windows));
  }, [windows, pauseOpen]);

  useEffect(() => {
    evaluate();
    const t = setInterval(evaluate, 30_000);
    return () => clearInterval(t);
  }, [evaluate]);

  // Reset (and run down) the "I'm safe" delay each time the gate appears.
  useEffect(() => {
    if (!active) return;
    setDelay(RISK_GATE_SAFE_DELAY_SECONDS);
    const t = setInterval(() => {
      setDelay((d) => (d > 0 ? d - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [active]);

  const clearGate = useCallback(() => {
    setReprieve();
    setActive(null);
  }, []);

  const handleSafe = () => {
    recordRiskEvent('safe').catch(() => {});
    clearGate();
  };

  const handlePause = () => {
    recordRiskEvent('paused').catch(() => {});
    setPauseOpen(true);
  };

  const handleSupport = () => {
    recordRiskEvent('support').catch(() => {});
    setReprieve();
  };

  const handlePauseChange = (open: boolean) => {
    setPauseOpen(open);
    if (!open) clearGate();
  };

  return (
    <>
      {active && !pauseOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-ink-950 p-5">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-5 py-8">
            <div className="text-center">
              <p className="text-5xl">🛑</p>
              <h1 className="mt-3 text-2xl font-bold text-slate-100">
                This is a high-risk moment
              </h1>
              <p className="muted mt-2">
                {active.label
                  ? `You flagged “${active.label}” as a risky time.`
                  : 'You flagged this as a risky time.'}{' '}
                Before anything else — pause and choose.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleSafe}
                disabled={delay > 0}
                className="btn w-full bg-brand-500 py-4 text-base text-ink-950 hover:bg-brand-400 disabled:opacity-60"
              >
                {delay > 0
                  ? `I'm safe — hold on (${delay}s)`
                  : "✅ I'm safe right now"}
              </button>

              <button
                onClick={handlePause}
                className="btn-ghost w-full py-4 text-base"
              >
                ⏳ Take a 10-minute pause
              </button>

              <a
                href={`tel:${phone}`}
                onClick={handleSupport}
                className="btn w-full bg-danger-600 py-4 text-base text-white hover:bg-danger-500"
              >
                📞 {phoneLabel}
              </a>
            </div>

            <p className="muted text-center text-xs">
              The rest of the app is locked until you choose. This delay is here
              to protect you — most urges pass within minutes.
            </p>
          </div>
        </div>
      )}

      <EmergencyPause
        hideTrigger
        open={pauseOpen}
        onOpenChange={handlePauseChange}
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
