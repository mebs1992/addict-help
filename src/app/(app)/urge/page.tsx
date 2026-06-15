import { getUrgeLogs } from '@/lib/data';
import { summariseUrges, zonedDayKey } from '@/lib/calculations';
import { URGE_TRIGGERS } from '@/lib/constants';
import { Banner, StatCard } from '@/components/ui';
import { UrgeForm } from './UrgeForm';

const TRIGGER_LABEL = Object.fromEntries(
  URGE_TRIGGERS.map((t) => [t.value, `${t.emoji} ${t.label}`]),
);

export default async function UrgePage({
  searchParams,
}: {
  searchParams: { logged?: string };
}) {
  const urges = await getUrgeLogs(30);
  const summary = summariseUrges(urges);
  const recent = urges.slice(0, 5);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Riding out an urge</h1>
        <p className="muted mt-1">
          You felt it and you came here instead. That&apos;s the whole game —
          let&apos;s log it and let it pass.
        </p>
      </div>

      {searchParams.logged && (
        <Banner tone="brand">
          Logged. The urge will pass — you just proved you don&apos;t have to act
          on it. +15 XP.
        </Banner>
      )}

      <UrgeForm />

      {summary.count > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Urges logged"
              value={summary.count}
              tone="brand"
              icon="🌊"
            />
            <StatCard
              label="Rode out"
              value={summary.resisted}
              sub="without gambling"
              tone="brand"
              icon="💪"
            />
            <StatCard
              label="Avg strength"
              value={`${summary.avgIntensity.toFixed(1)}`}
              sub="out of 10"
              tone="warn"
              icon="📈"
            />
          </div>
          {summary.topTrigger && (
            <p className="muted">
              Your most common trigger lately:{' '}
              <span className="font-medium text-slate-200">
                {TRIGGER_LABEL[summary.topTrigger] ?? summary.topTrigger}
              </span>
              .
            </p>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="card">
          <p className="muted mb-3">Recent urges</p>
          <ul className="space-y-2">
            {recent.map((u) => (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/5 p-3"
              >
                <span className="text-sm font-bold tabular-nums text-slate-300">
                  {u.intensity}/10
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">
                  {u.trigger
                    ? (TRIGGER_LABEL[u.trigger] ?? u.trigger)
                    : 'Urge logged'}
                  {u.note ? ` — ${u.note}` : ''}
                </span>
                <span className="muted shrink-0 text-xs">
                  {zonedDayKey(new Date(u.created_at)).slice(5)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
