import Link from 'next/link';
import { getProfile, getStreak } from '@/lib/data';
import { money, projectedYearlySavings } from '@/lib/calculations';
import { ProgressBar } from '@/components/ui';

export default async function VaultPage() {
  const [streak, profile] = await Promise.all([getStreak(), getProfile()]);
  const daily = profile?.daily_vault_amount ?? 5;
  const balance = streak?.vault_balance ?? 0;
  const current = streak?.current_streak ?? 0;
  const projectedYear = projectedYearlySavings(daily);
  const yearPct = projectedYear > 0 ? (balance / projectedYear) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Reward vault 🏦</h1>
        <p className="muted mt-1">
          Every day you don&apos;t gamble, {money(daily)} drops into your vault.
          This is real money you kept.
        </p>
      </div>

      <div className="card text-center">
        <p className="muted">Your vault balance</p>
        <p className="my-2 text-5xl font-bold text-brand-400">
          {money(balance)}
        </p>
        <p className="muted">
          from {Math.max(0, Math.round(balance / (daily || 1)))} gamble-free days
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between">
          <p className="muted">Progress toward a full year</p>
          <span className="pill bg-brand-500/20 text-brand-400">
            {Math.round(yearPct)}%
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar pct={yearPct} />
        </div>
        <p className="muted mt-2">
          If you keep this up, you&apos;ll save approximately{' '}
          <span className="font-semibold text-brand-400">
            {money(projectedYear)}
          </span>{' '}
          this year.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-tight text-center">
          <p className="muted">Current streak</p>
          <p className="stat text-brand-400">{current}d</p>
        </div>
        <div className="card-tight text-center">
          <p className="muted">Daily reward</p>
          <p className="stat">{money(daily)}</p>
        </div>
      </div>

      <p className="muted text-center">
        Want a bigger or smaller daily reward?{' '}
        <Link href="/settings" className="text-brand-400">
          Adjust it in settings
        </Link>
        .
      </p>
    </div>
  );
}
