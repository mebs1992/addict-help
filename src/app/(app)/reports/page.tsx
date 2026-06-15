import { getSessions } from '@/lib/data';
import { money, monthKey, sum } from '@/lib/calculations';
import { BarChart, type BarDatum } from '@/components/BarChart';
import { Banner, StatCard } from '@/components/ui';

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface MonthStat {
  key: string;
  label: string;
  total: number;
  daysGambled: number;
  biggestLoss: number;
}

export default async function ReportsPage() {
  const sessions = await getSessions();

  const now = new Date();
  const months: MonthStat[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const monthSessions = sessions.filter(
      (s) => monthKey(new Date(s.gambled_at)) === key,
    );
    const total = sum(monthSessions.map((s) => Number(s.amount)));
    const days = new Set(
      monthSessions.map((s) => new Date(s.gambled_at).toISOString().slice(0, 10)),
    ).size;
    const biggest = monthSessions.reduce(
      (m, s) => Math.max(m, Number(s.amount)),
      0,
    );
    months.push({
      key,
      label: MONTH_LABELS[d.getMonth()],
      total,
      daysGambled: days,
      biggestLoss: biggest,
    });
  }

  const thisMonth = months[months.length - 1];
  const prevMonths = months.slice(0, -1).filter((m) => m.total > 0);
  const prevAvg =
    prevMonths.length > 0
      ? sum(prevMonths.map((m) => m.total)) / prevMonths.length
      : 0;
  const savedVsAvg = prevAvg - thisMonth.total;

  const chartData: BarDatum[] = months.map((m) => ({
    label: m.label,
    value: m.total,
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Monthly report 📊</h1>
        <p className="muted mt-1">
          {MONTH_LABELS[now.getMonth()]} {now.getFullYear()} — and how it
          compares.
        </p>
      </div>

      {savedVsAvg > 0 && (
        <Banner tone="brand">
          You preserved {money(savedVsAvg)} this month compared to your recent
          average. That&apos;s real money kept.
        </Banner>
      )}
      {savedVsAvg < 0 && prevAvg > 0 && (
        <Banner tone="warn">
          You spent {money(Math.abs(savedVsAvg))} more than your recent average.
          No shame — notice the trend and keep going.
        </Banner>
      )}

      <div className="card">
        <p className="muted mb-3">Last 6 months</p>
        <BarChart data={chartData} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total this month"
          value={money(thisMonth.total)}
          tone={thisMonth.total > 0 ? 'danger' : 'brand'}
          icon="💸"
        />
        <StatCard
          label="Days gambled"
          value={thisMonth.daysGambled}
          sub="this month"
          icon="📅"
        />
        <StatCard
          label="Biggest loss"
          value={money(thisMonth.biggestLoss)}
          tone="danger"
          icon="🔺"
        />
        <StatCard
          label="vs recent average"
          value={
            prevAvg === 0
              ? '—'
              : savedVsAvg >= 0
                ? `↓ ${money(savedVsAvg)}`
                : `↑ ${money(Math.abs(savedVsAvg))}`
          }
          sub={prevAvg === 0 ? 'no history yet' : 'less is better'}
          tone={prevAvg === 0 ? 'default' : savedVsAvg >= 0 ? 'brand' : 'danger'}
          icon={savedVsAvg >= 0 ? '✅' : '⚠️'}
        />
      </div>

      <div className="card">
        <p className="muted mb-2">Month-by-month</p>
        <div className="divide-y divide-white/5">
          {[...months].reverse().map((m) => (
            <div key={m.key} className="flex items-center justify-between py-2.5">
              <span className="font-medium">{m.label}</span>
              <span className="muted">
                {m.daysGambled} day{m.daysGambled === 1 ? '' : 's'}
              </span>
              <span
                className={
                  prevAvg > 0 && m.total > prevAvg
                    ? 'font-semibold text-danger-400'
                    : 'font-semibold text-slate-100'
                }
              >
                {money(m.total)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
