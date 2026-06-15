import Link from 'next/link';
import {
  getRiskEvents,
  getSessions,
  getStreak,
  getUrgeLogs,
} from '@/lib/data';
import {
  behaviourModel,
  moodSpendBreakdown,
  money,
  rankTriggers,
  riskTimeWindows,
} from '@/lib/calculations';
import {
  BEHAVIOUR_WINDOW_DAYS,
  MOODS,
  URGE_TRIGGERS,
} from '@/lib/constants';
import { Banner, ProgressBar, StatCard } from '@/components/ui';

const MOOD = Object.fromEntries(MOODS.map((m) => [m.value, m]));
const TRIGGER = Object.fromEntries(URGE_TRIGGERS.map((t) => [t.value, t]));

function scoreTone(value: number): 'brand' | 'warn' | 'danger' {
  return value >= 70 ? 'brand' : value >= 40 ? 'warn' : 'danger';
}

export default async function InsightsPage() {
  const [sessions, urges, riskEvents, streak] = await Promise.all([
    getSessions(),
    getUrgeLogs(200),
    getRiskEvents(200),
    getStreak(),
  ]);

  const model = behaviourModel({
    lastGambleDate: streak?.last_gamble_date ?? null,
    sessionDates: sessions.map((s) => s.gambled_at),
    urgeDates: urges.filter((u) => u.resisted).map((u) => u.created_at),
    riskEventCount: riskEvents.length,
  });

  const timestamps = [
    ...sessions.map((s) => s.gambled_at),
    ...urges.map((u) => u.created_at),
    ...riskEvents.map((r) => r.created_at),
  ];
  const windows = riskTimeWindows(timestamps);
  const triggers = rankTriggers(urges.map((u) => u.trigger));
  const moodSpend = moodSpendBreakdown(
    sessions.map((s) => ({ mood_before: s.mood_before, amount: Number(s.amount) })),
  );
  const triggerMax = triggers[0]?.count ?? 1;
  const windowMax = windows[0]?.count ?? 1;
  const moodMax = moodSpend[0]?.total ?? 1;

  const stabilityTone = scoreTone(model.stabilityIndex);
  const stabilityToneText =
    stabilityTone === 'brand'
      ? 'text-brand-400'
      : stabilityTone === 'warn'
        ? 'text-warn-400'
        : 'text-danger-400';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Your patterns 🧠</h1>
        <p className="muted mt-1">
          What the last {BEHAVIOUR_WINDOW_DAYS} days are quietly telling you — no
          judgement, just signal.
        </p>
      </div>

      {/* Composite behaviour model (Spec §8) */}
      <div className="card text-center">
        <p className="muted">Behavioural stability</p>
        <p className={`my-1 text-6xl font-bold ${stabilityToneText}`}>
          {model.stabilityIndex}
        </p>
        <p className="font-medium text-slate-200">{model.stabilityLabel}</p>
        <div className="mt-3">
          <ProgressBar pct={model.stabilityIndex} tone={stabilityTone} />
        </div>
        <p className="muted mt-2 text-xs">
          A blend of how clean, how aware, and how steady you&apos;ve been —
          built to replace &ldquo;streak or bust&rdquo;.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Days since slip"
          value={model.daysSinceSlip === null ? '—' : model.daysSinceSlip}
          sub={model.daysSinceSlip === null ? 'none logged' : 'keep going'}
          tone="brand"
          icon="📆"
        />
        <StatCard
          label="Clean consistency"
          value={`${model.recoveryConsistency}`}
          sub="of 100"
          tone={scoreTone(model.recoveryConsistency)}
          icon="🧩"
        />
        <StatCard
          label="Urge awareness"
          value={`${model.urgeAwareness}`}
          sub="of 100"
          tone={scoreTone(model.urgeAwareness)}
          icon="🌊"
        />
      </div>

      {!model.hasSignal ? (
        <Banner tone="brand">
          Keep logging urges and sessions honestly — once there&apos;s a bit more
          history, this page will show your highest-risk times and triggers.
        </Banner>
      ) : (
        <>
          {/* Highest-risk time windows */}
          {windows.length > 0 && (
            <div className="card">
              <p className="font-semibold">When risk clusters</p>
              <p className="muted mb-3 text-xs">
                Across sessions, urges and risk-gate moments.
              </p>
              <ul className="space-y-2.5">
                {windows.map(({ part, count }) => (
                  <li key={part.key} className="flex items-center gap-3">
                    <span className="text-lg">{part.emoji}</span>
                    <span className="w-24 shrink-0 text-sm font-medium">
                      {part.label}
                    </span>
                    <div className="flex-1">
                      <ProgressBar
                        pct={(count / windowMax) * 100}
                        tone="warn"
                      />
                    </div>
                    <span className="muted w-6 text-right text-xs">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Strongest triggers */}
          {triggers.length > 0 && (
            <div className="card">
              <p className="font-semibold">Your strongest triggers</p>
              <p className="muted mb-3 text-xs">From the urges you&apos;ve named.</p>
              <ul className="space-y-2.5">
                {triggers.map(({ trigger, count }) => (
                  <li key={trigger} className="flex items-center gap-3">
                    <span className="text-lg">{TRIGGER[trigger]?.emoji}</span>
                    <span className="w-24 shrink-0 text-sm font-medium">
                      {TRIGGER[trigger]?.label ?? trigger}
                    </span>
                    <div className="flex-1">
                      <ProgressBar pct={(count / triggerMax) * 100} tone="brand" />
                    </div>
                    <span className="muted w-6 text-right text-xs">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mood → spend */}
          {moodSpend.length > 0 && (
            <div className="card">
              <p className="font-semibold">Mood before spending</p>
              <p className="muted mb-3 text-xs">
                Which feelings cost you the most.
              </p>
              <ul className="space-y-2.5">
                {moodSpend.slice(0, 5).map(({ mood, total, count }) => (
                  <li key={mood} className="flex items-center gap-3">
                    <span className="text-lg">{MOOD[mood]?.emoji}</span>
                    <span className="w-24 shrink-0 text-sm font-medium capitalize">
                      {MOOD[mood]?.label ?? mood}
                    </span>
                    <div className="flex-1">
                      <ProgressBar pct={(total / moodMax) * 100} tone="danger" />
                    </div>
                    <span className="muted w-16 text-right text-xs">
                      {money(total)}
                      <span className="text-slate-600"> ·{count}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="muted text-center text-xs">
        Patterns are power. Knowing your riskiest moments is how you plan around
        them.{' '}
        <Link href="/settings#risk-gate" className="text-brand-400">
          Set up your risk gate →
        </Link>
      </p>
    </div>
  );
}
