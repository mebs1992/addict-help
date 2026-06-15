import { getAchievements, getStreak } from '@/lib/data';
import { nextAchievement, recoveryStatus, rotatingMessage } from '@/lib/calculations';
import { ACHIEVEMENTS, RECOVERY_MESSAGES, RECOVERY_WINDOW_DAYS } from '@/lib/constants';
import { ProgressBar } from '@/components/ui';

export default async function StreakPage() {
  const [streak, achievements] = await Promise.all([
    getStreak(),
    getAchievements(),
  ]);

  const current = streak?.current_streak ?? 0;
  const longest = streak?.longest_streak ?? 0;
  const unlocked = new Set(achievements.map((a) => a.code));
  const next = nextAchievement(current);
  const nextPct = next ? Math.min(100, (current / next.days) * 100) : 100;
  const recovery = recoveryStatus(streak?.last_gamble_date ?? null);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Your streak 🔥</h1>
        <p className="muted mt-1">Every clean day is a brick in the wall.</p>
      </div>

      {recovery.inRecovery && (
        <div className="rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4">
          <p className="font-semibold text-brand-300">
            🌱 Recovery mode · day {recovery.day} of {RECOVERY_WINDOW_DAYS}
          </p>
          <p className="muted mt-1">
            {rotatingMessage(RECOVERY_MESSAGES)} A reset number isn&apos;t a
            reset on you.
          </p>
        </div>
      )}

      <div className="card flex items-center justify-around text-center">
        <div>
          <p className="text-5xl font-bold text-brand-400">{current}</p>
          <p className="muted">current days</p>
        </div>
        <div className="h-12 w-px bg-white/10" />
        <div>
          <p className="text-5xl font-bold">{longest}</p>
          <p className="muted">longest days</p>
        </div>
      </div>

      {next && (
        <div className="card">
          <div className="flex items-center justify-between">
            <p className="font-medium">
              Next: {next.emoji} {next.title}
            </p>
            <span className="muted">
              {current}/{next.days} days
            </span>
          </div>
          <div className="mt-3">
            <ProgressBar pct={nextPct} />
          </div>
          <p className="muted mt-2">
            {next.days - current} more day{next.days - current === 1 ? '' : 's'}{' '}
            to unlock.
          </p>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Achievements</h2>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlocked.has(a.code) || current >= a.days;
            return (
              <div
                key={a.code}
                className={`flex flex-col items-center gap-1 rounded-2xl border p-4 text-center transition ${
                  isUnlocked
                    ? 'animate-pop-in border-brand-500/50 bg-brand-500/10'
                    : 'border-white/5 bg-white/5 opacity-50'
                }`}
              >
                <span className={`text-3xl ${isUnlocked ? '' : 'grayscale'}`}>
                  {isUnlocked ? a.emoji : '🔒'}
                </span>
                <span className="text-xs font-semibold">{a.title}</span>
                <span className="text-[10px] text-slate-500">{a.days} days</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
