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
  guardrailsFor,
  money,
  monthKey,
  opportunityBreakdown,
  spendZone,
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

  const monthSpent = sum(
    sessions
      .filter((s) => monthKey(new Date(s.gambled_at)) === thisMonth)
      .map((s) => Number(s.amount)),
  );
  const lifetime = sum(sessions.map((s) => Number(s.amount)));

  const g = guardrailsFor(
    profile?.monthly_income ?? 0,
    profile?.monthly_expenses ?? 0,
  );
  const hasGuardrails = g.monthlyIncome > 0;
  const noRoom = hasGuardrails && g.disposable <= 0;
  const zone = spendZone(monthSpent, g);
  const usedPct = g.ceiling > 0 ? (monthSpent / g.ceiling) * 100 : 0;
  const safeMarkerPct = g.ceiling > 0 ? (g.safeLimit / g.ceiling) * 100 : 0;
  const tone: 'danger' | 'warn' | 'brand' =
    zone === 'danger' ? 'danger' : zone === 'caution' ? 'warn' : 'brand';
  const toneText =
    zone === 'danger'
      ? 'text-danger-400'
      : zone === 'caution'
        ? 'text-warn-400'
        : 'text-brand-400';
  const tonePill =
    zone === 'danger'
      ? 'bg-danger-500/20 text-danger-400'
      : zone === 'caution'
        ? 'bg-warn-500/20 text-warn-400'
        : 'bg-brand-500/20 text-brand-400';
  const needsAck =
    zone === 'danger' && !noRoom && budget && !budget.acknowledged_over;

  const opp = opportunityBreakdown(lifetime);
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

      {/* Not set up yet -> prompt the income + expenses setup */}
      {!hasGuardrails && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-3">
            <span>
              Add your income and expenses to unlock your safe limit.
            </span>
            <Link href="/budget" className="btn-ghost shrink-0 py-1.5">
              Set up
            </Link>
          </div>
        </Banner>
      )}

      {/* Expenses meet or exceed income -> nothing spare to gamble with */}
      {noRoom && (
        <div className="rounded-2xl border-2 border-danger-500/60 bg-danger-500/10 p-5">
          <p className="text-lg font-bold text-danger-400">
            Nothing spare this month.
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Your expenses ({money(g.monthlyExpenses)}) meet or exceed your income
            ({money(g.monthlyIncome)}), so any gambling comes straight out of
            essentials.{' '}
            {monthSpent > 0
              ? `You've already spent ${money(monthSpent)} this month.`
              : 'Your safe limit right now is $0.'}
          </p>
        </div>
      )}

      {/* Crossed the hard ceiling -> acknowledge honestly */}
      {needsAck && (
        <div className="rounded-2xl border-2 border-danger-500 bg-danger-500/15 p-5">
          <p className="text-lg font-bold text-danger-400">
            You&apos;ve crossed your hard ceiling.
          </p>
          <p className="mt-1 text-sm text-slate-200">
            Your ceiling is {money(g.ceiling)} and you&apos;ve spent{' '}
            {money(monthSpent)} this month. This isn&apos;t a verdict on you.
            Acknowledge it honestly and keep going.
          </p>
          <form action={acknowledgeOverBudget} className="mt-3">
            <button className="btn-danger w-full">
              I acknowledge I crossed my hard ceiling
            </button>
          </form>
        </div>
      )}

      {/* Guardrail meter — where this month's spend sits in the zones */}
      {hasGuardrails && !noRoom && (
        <div
          className={`card ${zone === 'danger' ? 'border-danger-500/50 bg-danger-500/5' : ''}`}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="muted">Spent this month</p>
              <p className="text-2xl font-bold">
                <span className={toneText}>{money(monthSpent)}</span>{' '}
                <span className="text-slate-500">
                  / {money(g.safeLimit)} safe
                </span>
              </p>
            </div>
            <span className={`pill ${tonePill}`}>
              {zone === 'safe'
                ? `${money(Math.max(0, g.safeLimit - monthSpent))} left`
                : zone === 'caution'
                  ? 'Over safe limit'
                  : 'Past your ceiling'}
            </span>
          </div>
          <div className="relative mt-3">
            <ProgressBar pct={usedPct} tone={tone} />
            {/* marker for the safe limit on the way to the ceiling */}
            <div
              className="absolute top-1/2 h-4 w-0.5 -translate-y-1/2 bg-white/60"
              style={{ left: `${Math.min(100, safeMarkerPct)}%` }}
              aria-hidden
            />
          </div>
          <div className="muted mt-2 flex justify-between">
            <span>Safe {money(g.safeLimit)}</span>
            <span>Ceiling {money(g.ceiling)}</span>
          </div>
          <p className="muted mt-2">
            {zone === 'safe'
              ? "You're in the green. Keep it here."
              : zone === 'caution'
                ? "You're over your safe limit — ease off before the ceiling."
                : "You've gone past what you can afford this month."}
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

      {/* Snapshot stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Safe monthly limit"
          value={hasGuardrails ? money(g.safeLimit) : '—'}
          sub={
            !hasGuardrails
              ? 'set up your budget'
              : noRoom
                ? 'nothing spare'
                : 'what you can afford'
          }
          tone="brand"
          icon="🛟"
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
          <p className="muted">You&apos;ve spent enough to buy:</p>
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
        />
      </div>

      {/* Navigation to deeper features */}
      <div className="space-y-2">
        <LinkCard href="/reality-check" emoji="🪞" title="Reality Check" desc="The full picture, impossible to ignore" />
        <LinkCard href="/vault" emoji="🏦" title="Reward Vault" desc="What your clean days are worth" />
        <LinkCard href="/streak" emoji="🔥" title="Streak & Achievements" desc="Your milestones" />
        <LinkCard href="/accountability" emoji="🧱" title="Accountability Wall" desc="Your reasons, in your words" />
        <LinkCard href="/reports" emoji="📊" title="Monthly Report" desc="Trends and compliance" />
        <LinkCard href="/budget" emoji="🎯" title="Your Guardrails" desc="Income and safe limit" />
      </div>
    </div>
  );
}
