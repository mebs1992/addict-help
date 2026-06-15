import Link from 'next/link';
import { getCurrentBudget, getProfile, getSessions } from '@/lib/data';
import {
  closestOpportunity,
  hoursWorked,
  investedFutureValue,
  money,
  monthKey,
  percentOverBudget,
  sum,
} from '@/lib/calculations';
import { INVEST_YEARS, RECOVERY_WINDOW_DAYS } from '@/lib/constants';
import { Banner } from '@/components/ui';

export default async function CheckInResultPage({
  searchParams,
}: {
  searchParams: { amount?: string };
}) {
  const amount = Math.max(0, parseFloat(searchParams.amount || '0') || 0);
  const [profile, budget, sessions] = await Promise.all([
    getProfile(),
    getCurrentBudget(),
    getSessions(),
  ]);

  const wage = profile?.hourly_wage ?? 25;
  const hours = hoursWorked(amount, wage);
  const futureValue = investedFutureValue(amount);

  const monthSpent = sum(
    sessions
      .filter((s) => monthKey(new Date(s.gambled_at)) === monthKey())
      .map((s) => Number(s.amount)),
  );
  const allowance = budget?.recommended_budget ?? 0;
  const overPct = percentOverBudget(monthSpent, allowance);
  const overBudget = allowance > 0 && monthSpent > allowance;
  const opp = closestOpportunity(amount);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-4xl">🫶</p>
        <h1 className="mt-2 text-2xl font-bold">Logged. Thank you.</h1>
        <p className="muted mt-1">
          You stayed honest with yourself. That&apos;s the hard part — and
          you&apos;ve earned XP for it.
        </p>
      </div>

      {/* Recovery Mode (7.2): a slip starts a window, not a punishment. */}
      <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4">
        <p className="font-semibold text-brand-300">
          🌱 You&apos;re in recovery mode for the next {RECOVERY_WINDOW_DAYS} days
        </p>
        <p className="muted mt-1">
          This week is about getting back on track, not starting from zero. Your
          vault keeps growing, gently, while you find your feet.
        </p>
      </div>

      <div className="card space-y-4">
        <div className="border-b border-white/5 pb-4">
          <p className="muted">You worked</p>
          <p className="text-3xl font-bold text-warn-400">
            {hours.toFixed(1)} hours
          </p>
          <p className="muted">for the {money(amount)} you spent.</p>
        </div>

        <div className="border-b border-white/5 pb-4">
          <p className="muted">
            That amount invested monthly for {INVEST_YEARS} years could become
            approximately
          </p>
          <p className="text-3xl font-bold text-brand-400">
            {money(futureValue)}
          </p>
        </div>

        {opp && (
          <div className="border-b border-white/5 pb-4">
            <p className="muted">That&apos;s about</p>
            <p className="text-xl font-semibold">
              {opp.emoji} one {opp.label}
            </p>
          </div>
        )}

        <div>
          <p className="muted">This month you&apos;re now</p>
          <p
            className={`text-3xl font-bold ${overBudget ? 'text-danger-400' : 'text-brand-400'}`}
          >
            {overBudget
              ? `${Math.round(overPct)}% over budget`
              : `${Math.round(Math.abs(overPct))}% under budget`}
          </p>
          <p className="muted">
            {money(monthSpent)} of {money(allowance)} allowance used.
          </p>
        </div>
      </div>

      <Banner tone="brand">
        One session does not erase your progress. Log it, learn from it, and
        keep moving forward.
      </Banner>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard" className="btn-ghost py-3">
          Back to home
        </Link>
        <Link href="/accountability" className="btn-primary py-3">
          Read my reasons
        </Link>
      </div>
    </div>
  );
}
