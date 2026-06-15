import {
  getEmergencyPauseContext,
  getProfile,
  getSessions,
  getStreak,
  getUrgeLogs,
} from '@/lib/data';
import {
  calculateFinancialPosition,
  monthKey,
  recoveryStatus,
  streakFromLastGamble,
  sum,
} from '@/lib/calculations';
import { BEHAVIOUR_RECENT_DAYS } from '@/lib/constants';
import { CheckInForm } from './CheckInForm';

function localDateTimeValue(d = new Date()): string {
  // YYYY-MM-DDTHH:mm in local time for datetime-local default.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export default async function CheckInPage() {
  const [profile, pauseContext, sessions, streak, urges] = await Promise.all([
    getProfile(),
    getEmergencyPauseContext(),
    getSessions(),
    getStreak(),
    getUrgeLogs(200),
  ]);

  const now = new Date();
  const financial = calculateFinancialPosition(
    profile?.monthly_income ?? 0,
    profile?.monthly_expenses ?? 0,
  );

  // Behavioural context for the Decision Mirror.
  const daysSinceLastGamble = streak?.last_gamble_date
    ? streakFromLastGamble(streak.last_gamble_date, now)
    : null;
  const recovery = recoveryStatus(streak?.last_gamble_date ?? null, now);
  const recentUrgeCutoff = now.getTime() - BEHAVIOUR_RECENT_DAYS * 86400000;
  const recentUrges = urges.filter(
    (u) => new Date(u.created_at).getTime() >= recentUrgeCutoff,
  ).length;

  // Historical context: average / biggest loss and this month vs recent average.
  const amounts = sessions.map((s) => Number(s.amount));
  const avgLoss = amounts.length ? sum(amounts) / amounts.length : 0;
  const biggestLoss = amounts.reduce((m, a) => Math.max(m, a), 0);

  const monthTotals = new Map<string, number>();
  for (const s of sessions) {
    const key = monthKey(new Date(s.gambled_at));
    monthTotals.set(key, (monthTotals.get(key) ?? 0) + Number(s.amount));
  }
  const thisMonthKey = monthKey(now);
  const thisMonthTotal = monthTotals.get(thisMonthKey) ?? 0;
  const priorTotals = [...monthTotals.entries()]
    .filter(([k, total]) => k !== thisMonthKey && total > 0)
    .map(([, total]) => total);
  const prevMonthlyAvg = priorTotals.length
    ? sum(priorTotals) / priorTotals.length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Before you spin</h1>
        <p className="muted mt-1">
          See what this decision means first. Nothing is logged until you choose
          to proceed — and one session never erases your progress.
        </p>
      </div>
      <CheckInForm
        consequenceMode={profile?.consequence_mode ?? false}
        defaultDateTime={localDateTimeValue()}
        hourlyWage={profile?.hourly_wage ?? 25}
        monthlySurplus={financial.surplus}
        daysSinceLastGamble={daysSinceLastGamble}
        inRecovery={recovery.inRecovery}
        recoveryDay={recovery.day}
        recoveryDaysLeft={recovery.daysLeft}
        recentUrges={recentUrges}
        avgLoss={avgLoss}
        biggestLoss={biggestLoss}
        thisMonthTotal={thisMonthTotal}
        prevMonthlyAvg={prevMonthlyAvg}
        {...pauseContext}
      />
    </div>
  );
}
