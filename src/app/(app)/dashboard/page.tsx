import Link from 'next/link';
import Image from 'next/image';
import { acknowledgeOverBudget } from '@/lib/actions';
import {
  getAccountabilityEntries,
  getCurrentBudget,
  getPrimaryGoal,
  getProfile,
  getSessions,
  getStreak,
} from '@/lib/data';
import {
  money,
  monthKey,
  opportunityBreakdown,
  percentOverBudget,
  sum,
} from '@/lib/calculations';
import { Banner, LinkCard, ProgressBar, StatCard } from '@/components/ui';
import { EmergencyPause } from '@/components/EmergencyPause';

export default async function DashboardPage() {
  const [profile, budget, sessions, streak, goal, accountability] =
    await Promise.all([
      getProfile(),
      getCurrentBudget(),
      getSessions(),
      getStreak(),
      getPrimaryGoal(),
      getAccountabilityEntries(),
    ]);

  const now = new Date();
  const thisMonth = monthKey(now);
  const thisYear = now.getFullYear();

  const monthSpent = sum(
    sessions
      .filter((s) => monthKey(new Date(s.gambled_at)) === thisMonth)
      .map((s) => Number(s.amount)),
  );
  const yearSpent = sum(
    sessions
      .filter((s) => new Date(s.gambled_at).getFullYear() === thisYear)
      .map((s) => Number(s.amount)),
  );
  const lifetime = sum(sessions.map((s) => Number(s.amount)));

  const allowance = budget?.recommended_budget ?? 0;
  const usedPct = allowance > 0 ? (monthSpent / allowance) * 100 : monthSpent > 0 ? 100 : 0;
  const overBudget = allowance > 0 && monthSpent > allowance;
  const overPct = percentOverBudget(monthSpent, allowance);
  const needsAck = overBudget && budget && !budget.acknowledged_over;

  const opp = opportunityBreakdown(yearSpent);
  const reasons = accountability
    .filter((e) => e.entry_type === 'reason')
    .map((e) => e.content)
    .slice(0, 3);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-5">
      <div>
        <p className="muted">Welcome back,</p>
        <h1 className="text-2xl font-bold">{firstName} 👋</h1>
      </div>

      {/* No budget yet -> prompt setup (Feature 1) */}
      {!budget && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-3">
            <span>Set up your monthly plan to see your allowance.</span>
            <Link href="/budget" className="btn-ghost shrink-0 py-1.5">
              Set up
            </Link>
          </div>
        </Banner>
      )}

      {/* Over-budget acknowledgement (Feature 1) */}
      {needsAck && (
        <div className="rounded-2xl border-2 border-danger-500 bg-danger-500/15 p-5">
          <p className="text-lg font-bold text-danger-400">
            You&apos;ve gone over your plan.
          </p>
          <p className="mt-1 text-sm text-slate-200">
            You set a limit of {money(allowance)} and have spent{' '}
            {money(monthSpent)} — that&apos;s {Math.round(overPct)}% over. This
            isn&apos;t a verdict on you. Acknowledge it honestly and keep going.
          </p>
          <form action={acknowledgeOverBudget} className="mt-3">
            <button className="btn-danger w-full">
              I acknowledge I exceeded my planned limit
            </button>
          </form>
        </div>
      )}

      {/* Budget meter (Feature 1) */}
      {budget && (
        <div
          className={`card ${overBudget ? 'border-danger-500/50 bg-danger-500/5' : ''}`}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="muted">This month&apos;s allowance</p>
              <p className="text-2xl font-bold">
                <span className={overBudget ? 'text-danger-400' : 'text-slate-100'}>
                  {money(monthSpent)}
                </span>{' '}
                <span className="text-slate-500">/ {money(allowance)}</span>
              </p>
            </div>
            <span
              className={`pill ${overBudget ? 'bg-danger-500/20 text-danger-400' : 'bg-brand-500/20 text-brand-400'}`}
            >
              {overBudget
                ? `${Math.round(overPct)}% over`
                : `${money(Math.max(0, allowance - monthSpent))} left`}
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar pct={usedPct} tone={overBudget ? 'danger' : usedPct > 80 ? 'warn' : 'brand'} />
          </div>
          <p className="muted mt-2">
            You have used {money(monthSpent)} of your {money(allowance)} monthly
            allowance.
          </p>
        </div>
      )}

      {/* Future Self (Feature 6) */}
      {(profile?.future_self_image_url || goal?.image_url || profile?.future_self_caption) && (
        <Link href="/future-self" className="block overflow-hidden rounded-2xl border border-white/10">
          <div className="relative h-40 w-full bg-ink-800">
            {(profile?.future_self_image_url || goal?.image_url) && (
              <Image
                src={(profile?.future_self_image_url || goal?.image_url)!}
                alt="What you're saving for"
                fill
                sizes="(max-width: 768px) 100vw, 28rem"
                className="object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
            <div className="absolute bottom-0 p-4">
              <p className="text-sm font-medium text-white drop-shadow">
                {profile?.future_self_caption ||
                  'Your next gambling session costs progress toward this goal.'}
              </p>
            </div>
          </div>
        </Link>
      )}

      {/* Reality check snapshot (Feature 11) */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="This year"
          value={money(yearSpent)}
          sub="gambled so far"
          tone="danger"
          icon="📉"
        />
        <StatCard
          label="Reward vault"
          value={money(streak?.vault_balance ?? 0)}
          sub="saved by not gambling"
          tone="brand"
          icon="🏦"
        />
        <StatCard
          label="Current streak"
          value={`${streak?.current_streak ?? 0}d`}
          sub={`Longest: ${streak?.longest_streak ?? 0}d`}
          tone="brand"
          icon="🔥"
        />
        <StatCard
          label="Lifetime logged"
          value={money(lifetime)}
          sub="total recorded losses"
          tone="danger"
          icon="🧾"
        />
      </div>

      {/* Opportunity cost (Feature 3) */}
      {opp.length > 0 && (
        <div className="card">
          <p className="muted">You&apos;ve spent enough this year to buy:</p>
          <ul className="mt-3 space-y-2">
            {opp.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="text-xl">{item.emoji}</span>
                <span className="font-medium">
                  {item.quantity} × {item.label}
                </span>
                <span className="muted ml-auto">
                  {money(item.quantity * item.cost)}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/opportunity-cost" className="muted mt-3 inline-block text-brand-400">
            See full breakdown →
          </Link>
        </div>
      )}

      {/* Primary CTA + emergency (Features 2, 7) */}
      <div className="space-y-3">
        <Link href="/check-in" className="btn-primary w-full py-4 text-base">
          ➕ I Gambled Today
        </Link>
        <EmergencyPause
          monthlyLosses={monthSpent}
          currentStreak={streak?.current_streak ?? 0}
          goalTitle={goal?.title ?? null}
          goalSaved={goal ? Number(goal.saved_amount) : 0}
          goalTarget={goal ? Number(goal.target_amount) : 0}
          reasons={reasons}
          money={money}
        />
      </div>

      {/* Navigation to deeper features */}
      <div className="space-y-2">
        <LinkCard href="/reality-check" emoji="🪞" title="Reality Check" desc="The full picture, impossible to ignore" />
        <LinkCard href="/vault" emoji="🏦" title="Reward Vault" desc="What your clean days are worth" />
        <LinkCard href="/streak" emoji="🔥" title="Streak & Achievements" desc="Your milestones" />
        <LinkCard href="/accountability" emoji="🧱" title="Accountability Wall" desc="Your reasons, in your words" />
        <LinkCard href="/reports" emoji="📊" title="Monthly Report" desc="Trends and compliance" />
        <LinkCard href="/budget" emoji="🎯" title="Budget Plan" desc="Income, expenses, allowance" />
      </div>
    </div>
  );
}
