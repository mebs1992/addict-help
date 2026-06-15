import { getAllBudgets, getSessions } from '@/lib/data';
import { money, monthKey, sum, zonedDayKey } from '@/lib/calculations';
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
  allowance: number | null;
}

export default async function ReportsPage() {
  const [sessions, budgets] = await Promise.all([
    getSessions(),
    getAllBudgets(),
  ]);

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
      monthSessions.map((s) => zonedDayKey(new Date(s.gambled_at))),
    ).size;
    const biggest = monthSessions.reduce(
      (m, s) => Math.max(m, Number(s.amount)),
      0,
    );
    const budget = budgets.find((b) => b.month === key);
    months.push({
      key,
      label: MONTH_LABELS[d.getMonth()],
      total,
      daysGambled: days,
      biggestLoss: biggest,
      allowance: budget?.recommended_budget ?? null,
    });
  }

  const thisMonth = months[months.length - 1];
  const prevMonths = months.slice(0, -1).filter((m) => m.total > 0);
  const prevAvg =
    prevMonths.length > 0
      ? sum(prevMonths.map((m) => m.total)) / prevMonths.length
      : 0;
  const savedVsAvg = prevAvg - thisMonth.total;
  const compliant =
    thisMonth.allowance != null && thisMonth.total <= thisMonth.allowance;

  const chartData: BarDatum[] = months.map((m) => ({
    label: m.label,
    value: m.total,
    budget: m.allowance,
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
          You saved {money(savedVsAvg)} this month compared to your previous
          average. That&apos;s real progress.
        </Banner>
      )}
      {savedVsAvg < 0 && prevAvg > 0 && (
        <Banner tone="warn">
          You spent {money(Math.abs(savedVsAvg))} more than your recent average.
          You exceeded your plan — log it honestly and move forward.
        </Banner>
      )}

      <div className="card">
        <p className="muted mb-3">Last 6 months (dashed line = allowance)</p>
        <BarChart data={chartData} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total this month"
          value={money(thisMonth.total)}
          tone={compliant ? 'brand' : 'danger'}
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
          label="Budget"
          value={
            thisMonth.allowance == null
              ? '—'
              : compliant
                ? 'On track'
                : 'Over'
          }
          sub={
            thisMonth.allowance == null
              ? 'no plan set'
              : `${money(thisMonth.allowance)} allowance`
          }
          tone={compliant ? 'brand' : 'danger'}
          icon={compliant ? '✅' : '⚠️'}
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
                  m.allowance != null && m.total > m.allowance
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
