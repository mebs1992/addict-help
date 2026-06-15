import Link from 'next/link';
import Image from 'next/image';
import { acknowledgeOverBudget, logCleanDay } from '@/lib/actions';
import {
  getAccountabilityEntries,
  getCurrentBudget,
  getPrimaryGoal,
  getProfile,
  getRiskEvents,
  getSessions,
  getStreak,
  getUrgeLogs,
} from '@/lib/data';
import {
  activeRiskWindow,
  behaviourModel,
  dayKey,
  exposureRisk,
  futureSelfMessage,
  guardrailsFor,
  money,
  monthKey,
  opportunityBreakdown,
  recoveryStatus,
  rotatingMessage,
  spendZone,
  sum,
} from '@/lib/calculations';
import { RECOVERY_MESSAGES, RECOVERY_WINDOW_DAYS } from '@/lib/constants';
import { Banner, LinkCard, ProgressBar, StatCard } from '@/components/ui';
import { EmergencyPause } from '@/components/EmergencyPause';

export default async function DashboardPage() {
  const [profile, budget, sessions, streak, goal, accountability, urges, riskEvents] =
    await Promise.all([
      getProfile(),
      getCurrentBudget(),
      getSessions(),
      getStreak(),
      getPrimaryGoal(),
      getAccountabilityEntries(),
      getUrgeLogs(200),
      getRiskEvents(200),
    ]);

  const now = new Date();
  const thisMonth = monthKey(now);
  const today = dayKey(now);

  const monthSpent = sum(
    sessions
      .filter((s) => monthKey(new Date(s.gambled_at)) === thisMonth)
      .map((s) => Number(s.amount)),
  );
  const lifetime = sum(sessions.map((s) => Number(s.amount)));
  const gambledToday = sessions.some(
    (s) => dayKey(new Date(s.gambled_at)) === today,
  );
  const checkedInToday = profile?.last_clean_checkin === today;

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

  const exposure = exposureRisk(
    profile?.spendings_balance ?? 0,
    profile?.savings_balance ?? 0,
    profile?.offset_balance ?? 0,
    g.disposable,
  );
  const hasAccounts = exposure.accessible > 0 || exposure.protectedFunds > 0;
  const expTone: 'danger' | 'warn' | 'brand' =
    exposure.level === 'high'
      ? 'danger'
      : exposure.level === 'moderate'
        ? 'warn'
        : 'brand';
  const expPill =
    exposure.level === 'high'
      ? 'bg-danger-500/20 text-danger-400'
      : exposure.level === 'moderate'
        ? 'bg-warn-500/20 text-warn-400'
        : 'bg-brand-500/20 text-brand-400';
  const expBarPct =
    exposure.level === 'high' ? 100 : exposure.level === 'moderate' ? 60 : 25;
  const expMessage =
    exposure.level === 'high'
      ? 'A lot of cash is within easy reach. Moving spare savings into your offset makes it far harder to touch in a weak moment — and cuts mortgage interest.'
      : exposure.level === 'moderate'
        ? 'Some cash is within easy reach. Parking spare savings in your offset keeps it out of one-tap range.'
        : 'Little cash sits within easy reach — your exposure is low. Keep it that way.';

  const opp = opportunityBreakdown(lifetime);
  const reasons = accountability
    .filter((e) => e.entry_type === 'reason')
    .map((e) => e.content)
    .slice(0, 3);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Recovery Mode (7.2) + composite behaviour model (§8).
  const recovery = recoveryStatus(streak?.last_gamble_date ?? null, now);
  const recoveryMsg = rotatingMessage(RECOVERY_MESSAGES, now);
  const model = behaviourModel({
    lastGambleDate: streak?.last_gamble_date ?? null,
    sessionDates: sessions.map((s) => s.gambled_at),
    urgeDates: urges.filter((u) => u.resisted).map((u) => u.created_at),
    riskEventCount: riskEvents.length,
  });
  const stabilityToneText =
    model.stabilityIndex >= 70
      ? 'text-brand-400'
      : model.stabilityIndex >= 40
        ? 'text-warn-400'
        : 'text-danger-400';

  // Future Self contextual message (7.6) — high-risk / recovery / milestone.
  const inHighRiskWindow = !!activeRiskWindow(
    profile?.high_risk_windows ?? [],
    now,
  );
  const future = futureSelfMessage({
    inHighRiskWindow,
    inRecovery: recovery.inRecovery,
    streakDays: streak?.current_streak ?? 0,
    date: now,
  });

  return (
    <div className="space-y-5">
      <div>
        <p className="muted">Welcome back,</p>
        <h1 className="text-2xl font-bold">{firstName} 👋</h1>
      </div>

      {/* Recovery Mode (7.2): reframe a recent slip as a window to recover in,
          not a streak to mourn. */}
      {recovery.inRecovery && (
        <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-brand-300">
              🌱 Recovery mode · day {recovery.day} of {RECOVERY_WINDOW_DAYS}
            </p>
            <span className="pill bg-brand-500/20 text-brand-400 shrink-0">
              {recovery.daysLeft}d left
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-200">{recoveryMsg}</p>
          <div className="mt-3 flex gap-2">
            <Link href="/urge" className="btn-ghost flex-1 py-2 text-sm">
              Log an urge
            </Link>
            <Link href="/accountability" className="btn-ghost flex-1 py-2 text-sm">
              Your reasons
            </Link>
          </div>
        </div>
      )}

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

      {/* Exposure risk — how much cash is within easy reach to gamble */}
      {hasAccounts && (
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="muted">Exposure risk</p>
            <span className={`pill ${expPill} capitalize`}>
              {exposure.level}
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <p className="muted">Within easy reach</p>
              <p className="text-2xl font-bold text-slate-100">
                {money(exposure.accessible)}
              </p>
            </div>
            {exposure.protectedFunds > 0 && (
              <div className="text-right">
                <p className="muted">Protected (offset)</p>
                <p className="font-semibold text-brand-400">
                  {money(exposure.protectedFunds)}
                </p>
              </div>
            )}
          </div>
          <div className="mt-3">
            <ProgressBar pct={expBarPct} tone={expTone} />
          </div>
          <p className="muted mt-2">{expMessage}</p>
          <Link
            href="/budget"
            className="muted mt-3 inline-block text-brand-400"
          >
            Update balances →
          </Link>
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
              <p className="text-sm font-semibold text-white drop-shadow">
                {profile?.future_self_caption || future.message}
              </p>
              {profile?.future_self_caption && (
                <p className="mt-1 text-xs text-white/85 drop-shadow">
                  {future.message}
                </p>
              )}
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
        {/* Daily clean-day affirmation */}
        {!gambledToday &&
          (checkedInToday ? (
            <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4 text-center text-sm font-medium text-brand-400">
              ✅ You logged a clean day today. Proud of you — that&apos;s how
              streaks are built.
            </div>
          ) : (
            <form action={logCleanDay}>
              <button className="btn w-full bg-brand-600 py-4 text-base text-white hover:bg-brand-500">
                ✅ I didn&apos;t gamble today
              </button>
            </form>
          ))}
        {/* Urge tracking — interrupt the craving before it becomes a spend */}
        {!gambledToday && (
          <Link
            href="/urge"
            className="btn w-full border border-brand-500/40 bg-brand-500/10 py-4 text-base text-brand-300 hover:bg-brand-500/20"
          >
            🌊 I&apos;m feeling an urge — log it
          </Link>
        )}
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

      {/* Behavioural stability (Spec §8) — patterns over streak-or-bust */}
      {model.events > 0 && (
        <Link
          href="/insights"
          className="card block transition hover:border-brand-500/40 hover:bg-ink-800/70"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="muted">Behavioural stability</p>
              <p className={`text-3xl font-bold ${stabilityToneText}`}>
                {model.stabilityIndex}
                <span className="text-base text-slate-500">/100</span>
              </p>
              <p className="muted">{model.stabilityLabel}</p>
            </div>
            <span className="text-3xl">🧠</span>
          </div>
          <div className="mt-3">
            <ProgressBar
              pct={model.stabilityIndex}
              tone={
                model.stabilityIndex >= 70
                  ? 'brand'
                  : model.stabilityIndex >= 40
                    ? 'warn'
                    : 'danger'
              }
            />
          </div>
          <p className="muted mt-2 text-brand-400">See your patterns →</p>
        </Link>
      )}

      {/* Navigation to deeper features */}
      <div className="space-y-2">
        <LinkCard href="/urge" emoji="🌊" title="Urge Tracker" desc="Name a craving, watch it pass" />
        <LinkCard href="/insights" emoji="🧠" title="Insights" desc="Your risk times, triggers and patterns" />
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
