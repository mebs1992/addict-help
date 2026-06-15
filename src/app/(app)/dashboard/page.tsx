import Link from 'next/link';
import Image from 'next/image';
import { logCleanDay } from '@/lib/actions';
import {
  getAccountabilityEntries,
  getPrimaryGoal,
  getProfile,
  getRiskEvents,
  getSessions,
  getStreak,
  getUrgeLogs,
} from '@/lib/data';
import {
  behaviourModel,
  calculateBehaviouralRisk,
  calculateExposureRisk,
  calculateFinancialPosition,
  calculateInterventionLevel,
  dayKey,
  money,
  monthKey,
  opportunityBreakdown,
  recoveryStatus,
  rotatingMessage,
  sum,
} from '@/lib/calculations';
import {
  BEHAVIOURAL_RISK_BLURBS,
  EXPOSURE_BLURBS,
  FINANCIAL_POSITION_BLURBS,
  FINANCIAL_POSITION_LABELS,
  INTERVENTION_LABELS,
  RECOVERY_MESSAGES,
  RECOVERY_WINDOW_DAYS,
  RISK_BAND_LABELS,
} from '@/lib/constants';
import type {
  FinancialPositionLevel,
  InterventionLevel,
  RiskBand,
} from '@/lib/types';
import {
  Banner,
  LinkCard,
  ProgressBar,
  RiskDimensionCard,
  StatCard,
  type Tone,
} from '@/components/ui';
import { EmergencyPause } from '@/components/EmergencyPause';

const FINANCIAL_TONE: Record<FinancialPositionLevel, Tone> = {
  strong: 'brand',
  stable: 'warn',
  fragile: 'danger',
};
const BAND_TONE: Record<RiskBand, Tone> = {
  low: 'brand',
  moderate: 'warn',
  high: 'danger',
};
// How full a dimension's concern meter reads (longer = more attention needed).
const FINANCIAL_PCT: Record<FinancialPositionLevel, number> = {
  strong: 25,
  stable: 60,
  fragile: 100,
};
const BAND_PCT: Record<RiskBand, number> = { low: 25, moderate: 60, high: 100 };

const INTERVENTION_TONE: Record<InterventionLevel, Tone> = {
  minimal: 'brand',
  reflection: 'warn',
  maximum: 'danger',
};
const INTERVENTION_BLURB: Record<InterventionLevel, string> = {
  minimal:
    'Everything is steady right now. Keep doing what you are doing — and keep the cost visible.',
  reflection:
    'A few signals are worth a pause. Slow any decision down and check in with your reasons.',
  maximum:
    'Several signals line up against you right now. This is the moment to lean hard on your supports.',
};

export default async function DashboardPage() {
  const [profile, sessions, streak, goal, accountability, urges, riskEvents] =
    await Promise.all([
      getProfile(),
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

  // Dimension 1 — Financial Position (resilience to a setback).
  const financial = calculateFinancialPosition(
    profile?.monthly_income ?? 0,
    profile?.monthly_expenses ?? 0,
  );
  const hasFinancials = financial.monthlyIncome > 0;

  // Dimension 2 — Exposure Risk (how much cash is realistically reachable).
  const exposure = calculateExposureRisk(
    profile?.spendings_balance ?? 0,
    profile?.savings_balance ?? 0,
    profile?.offset_balance ?? 0,
    financial.surplus,
  );
  const hasAccounts = exposure.accessible > 0 || exposure.protectedFunds > 0;

  // Dimension 3 — Behavioural Risk (relapse vulnerability — the key signal).
  const behavioural = calculateBehaviouralRisk({
    lastGambleDate: streak?.last_gamble_date ?? null,
    sessionDates: sessions.map((s) => s.gambled_at),
    urges: urges.map((u) => ({
      intensity: u.intensity,
      created_at: u.created_at,
    })),
    today: now,
  });

  // Combined intervention level — only meaningful once finances are known.
  const intervention = hasFinancials
    ? calculateInterventionLevel(
        financial.level,
        exposure.level,
        behavioural.level,
      )
    : null;

  // Preserved value + days since the last session — the primary reinforcement.
  const preserved = streak?.vault_balance ?? 0;
  const daysSince = behavioural.daysSinceSlip ?? streak?.current_streak ?? 0;
  const everGambled = behavioural.daysSinceSlip !== null;

  const opp = opportunityBreakdown(lifetime);
  const reasons = accountability
    .filter((e) => e.entry_type === 'reason')
    .map((e) => e.content)
    .slice(0, 3);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  // Recovery Mode (7.2) + composite control score (§8).
  const recovery = recoveryStatus(streak?.last_gamble_date ?? null, now);
  const recoveryMsg = rotatingMessage(RECOVERY_MESSAGES, now);
  const model = behaviourModel({
    lastGambleDate: streak?.last_gamble_date ?? null,
    sessionDates: sessions.map((s) => s.gambled_at),
    urgeDates: urges.filter((u) => u.resisted).map((u) => u.created_at),
    riskEventCount: riskEvents.length,
  });
  const controlTone: Tone =
    model.stabilityIndex >= 70
      ? 'brand'
      : model.stabilityIndex >= 40
        ? 'warn'
        : 'danger';

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

      {/* Preserved value — what non-gambling behaviour has kept in your pocket.
          The primary reward: show what was retained, not what was avoided. */}
      <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="muted">Preserved value</p>
            <p className="text-4xl font-bold text-brand-400">
              {money(preserved)}
            </p>
            <p className="muted mt-1">
              Money you kept by not gambling. It is still yours.
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-slate-100">{daysSince}</p>
            <p className="muted">
              {everGambled ? 'days since last session' : 'days clean'}
            </p>
          </div>
        </div>
      </div>

      {/* Not set up yet -> prompt the income + expenses setup */}
      {!hasFinancials && (
        <Banner tone="warn">
          <div className="flex items-center justify-between gap-3">
            <span>
              Add your income and expenses to see your financial position.
            </span>
            <Link href="/budget" className="btn-ghost shrink-0 py-1.5">
              Set up
            </Link>
          </div>
        </Banner>
      )}

      {/* Combined readout across the three dimensions. */}
      {intervention && (
        <div
          className={`rounded-2xl border p-4 text-sm font-medium ${
            intervention.level === 'maximum'
              ? 'border-danger-500/40 bg-danger-500/10 text-danger-400'
              : intervention.level === 'reflection'
                ? 'border-warn-500/40 bg-warn-500/10 text-warn-400'
                : 'border-brand-500/40 bg-brand-500/10 text-brand-400'
          }`}
        >
          <p className="font-bold">{INTERVENTION_LABELS[intervention.level]}</p>
          <p className="mt-1 text-slate-200">
            {INTERVENTION_BLURB[intervention.level]}
          </p>
        </div>
      )}

      {/* Dimension 1 — Financial Position */}
      {hasFinancials && (
        <RiskDimensionCard
          label="Financial position"
          headline={FINANCIAL_POSITION_LABELS[financial.level]}
          band={FINANCIAL_POSITION_LABELS[financial.level]}
          tone={FINANCIAL_TONE[financial.level]}
          blurb={FINANCIAL_POSITION_BLURBS[financial.level]}
          barPct={FINANCIAL_PCT[financial.level]}
          icon="💪"
          right={
            <div className="text-right">
              <p className="muted">Monthly surplus</p>
              <p className="font-semibold text-slate-100">
                {money(financial.surplus)}
              </p>
            </div>
          }
          footer={
            <Link
              href="/budget"
              className="muted mt-3 inline-block text-brand-400"
            >
              Update income &amp; expenses →
            </Link>
          }
        />
      )}

      {/* Dimension 2 — Exposure Risk */}
      {hasAccounts && (
        <RiskDimensionCard
          label="Exposure risk"
          headline={RISK_BAND_LABELS[exposure.level]}
          band={RISK_BAND_LABELS[exposure.level]}
          tone={BAND_TONE[exposure.level]}
          blurb={EXPOSURE_BLURBS[exposure.level]}
          barPct={BAND_PCT[exposure.level]}
          icon="💧"
          right={
            <div className="text-right">
              <p className="muted">Within easy reach</p>
              <p className="font-semibold text-slate-100">
                {money(exposure.accessible)}
              </p>
              {exposure.protectedFunds > 0 && (
                <p className="text-xs text-brand-400">
                  {money(exposure.protectedFunds)} protected
                </p>
              )}
            </div>
          }
          footer={
            <Link
              href="/budget"
              className="muted mt-3 inline-block text-brand-400"
            >
              Update balances →
            </Link>
          }
        />
      )}

      {/* Dimension 3 — Behavioural Risk (relapse vulnerability) */}
      <RiskDimensionCard
        label="Behavioural risk"
        headline={RISK_BAND_LABELS[behavioural.level]}
        band={RISK_BAND_LABELS[behavioural.level]}
        tone={BAND_TONE[behavioural.level]}
        blurb={BEHAVIOURAL_RISK_BLURBS[behavioural.level]}
        barPct={BAND_PCT[behavioural.level]}
        icon="🧠"
        right={
          <div className="text-right">
            <p className="muted">Last 7 days</p>
            <p className="font-semibold text-slate-100">
              {behavioural.recentSessions} session
              {behavioural.recentSessions === 1 ? '' : 's'}
            </p>
            <p className="text-xs text-slate-400">
              {behavioural.recentUrges} urge
              {behavioural.recentUrges === 1 ? '' : 's'} logged
            </p>
          </div>
        }
        footer={
          <Link
            href="/insights"
            className="muted mt-3 inline-block text-brand-400"
          >
            See your patterns →
          </Link>
        }
      />

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

      {/* Snapshot stats — streak, vault and XP remain, now secondary. */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Days since session"
          value={`${daysSince}d`}
          sub={everGambled ? 'keep going' : 'none logged'}
          tone="brand"
          icon="📆"
        />
        <StatCard
          label="Reward vault"
          value={money(preserved)}
          sub="kept by not gambling"
          tone="brand"
          icon="🏦"
        />
        <StatCard
          label="This month"
          value={money(monthSpent)}
          sub="logged this month"
          tone={monthSpent > 0 ? 'danger' : 'brand'}
          icon="📅"
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
              recovery is built.
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

      {/* Control score (Spec §8) — recovery consistency over streak-or-bust */}
      {model.events > 0 && (
        <Link
          href="/insights"
          className="card block transition hover:border-brand-500/40 hover:bg-ink-800/70"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="muted">Control score</p>
              <p className={`text-3xl font-bold ${
                controlTone === 'brand'
                  ? 'text-brand-400'
                  : controlTone === 'warn'
                    ? 'text-warn-400'
                    : 'text-danger-400'
              }`}>
                {model.stabilityIndex}
                <span className="text-base text-slate-500">/100</span>
              </p>
              <p className="muted">{model.stabilityLabel}</p>
            </div>
            <span className="text-3xl">🧭</span>
          </div>
          <div className="mt-3">
            <ProgressBar pct={model.stabilityIndex} tone={controlTone} />
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
        <LinkCard href="/streak" emoji="🔥" title="Recovery & Achievements" desc="Days since, milestones" />
        <LinkCard href="/accountability" emoji="🧱" title="Accountability Wall" desc="Your reasons, in your words" />
        <LinkCard href="/reports" emoji="📊" title="Monthly Report" desc="Trends over time" />
        <LinkCard href="/budget" emoji="💪" title="Financial Position" desc="Income, expenses and exposure" />
      </div>
    </div>
  );
}
