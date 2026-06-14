import { getProfile, getSessions } from '@/lib/data';
import { hoursWorked, money, monthKey, sum } from '@/lib/calculations';
import { StatCard } from '@/components/ui';

export default async function RealityCheckPage() {
  const [profile, sessions] = await Promise.all([getProfile(), getSessions()]);
  const wage = profile?.hourly_wage ?? 25;

  const lifetime = sum(sessions.map((s) => Number(s.amount)));
  const monthTotal = sum(
    sessions
      .filter((s) => monthKey(new Date(s.gambled_at)) === monthKey())
      .map((s) => Number(s.amount)),
  );
  const count = sessions.length;
  const avg = count > 0 ? lifetime / count : 0;
  const largest = sessions.reduce((m, s) => Math.max(m, Number(s.amount)), 0);
  const totalHours = hoursWorked(lifetime, wage);
  const daysOfWork = totalHours / 8;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Reality check 🪞</h1>
        <p className="muted mt-1">
          No spin. No softening. This is the real number.
        </p>
      </div>

      <div className="rounded-2xl border-2 border-danger-500/50 bg-danger-500/10 p-6 text-center">
        <p className="muted">Total lifetime losses recorded</p>
        <p className="my-2 text-5xl font-bold text-danger-400">
          {money(lifetime)}
        </p>
        <p className="text-sm text-slate-300">
          That&apos;s {totalHours.toFixed(0)} hours of your life — about{' '}
          {daysOfWork.toFixed(1)} full working days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="This month"
          value={money(monthTotal)}
          tone="danger"
          icon="📅"
        />
        <StatCard
          label="Largest single loss"
          value={money(largest)}
          tone="danger"
          icon="🔺"
        />
        <StatCard
          label="Average per session"
          value={money(avg)}
          sub={`${count} sessions logged`}
          icon="📊"
        />
        <StatCard
          label="Hours worked for it"
          value={`${totalHours.toFixed(0)}h`}
          sub={`at ${money(wage)}/hr`}
          tone="warn"
          icon="⏱️"
        />
      </div>

      <p className="muted text-center">
        These numbers aren&apos;t here to shame you — they&apos;re here so the
        cost is never invisible again.
      </p>
    </div>
  );
}
