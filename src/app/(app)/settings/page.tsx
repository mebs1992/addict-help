import { signOut, updateSettings } from '@/lib/actions';
import { getProfile } from '@/lib/data';
import { levelForXp, money } from '@/lib/calculations';
import { LEVELS } from '@/lib/constants';
import { Banner, ProgressBar } from '@/components/ui';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const profile = await getProfile();
  const xp = profile?.xp ?? 0;
  const { current, next, progressPct } = levelForXp(xp);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">You</h1>
        <p className="muted mt-1">{profile?.email}</p>
      </div>

      {searchParams.saved && <Banner tone="brand">Settings saved.</Banner>}

      {/* Gamification (Feature 13) */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="muted">Level {current.level}</p>
            <p className="text-xl font-bold">
              {current.emoji} {current.name}
            </p>
          </div>
          <span className="pill bg-brand-500/20 text-brand-400">{xp} XP</span>
        </div>
        <div className="mt-3">
          <ProgressBar pct={progressPct} />
        </div>
        {next ? (
          <p className="muted mt-2">
            {next.minXp - xp} XP to {next.emoji} {next.name}
          </p>
        ) : (
          <p className="muted mt-2">Top level reached. 🕊️</p>
        )}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {LEVELS.map((l) => (
            <div
              key={l.level}
              className={`rounded-xl border p-2 text-center text-[10px] ${
                xp >= l.minXp
                  ? 'border-brand-500/40 bg-brand-500/10 text-brand-300'
                  : 'border-white/5 bg-white/5 text-slate-500'
              }`}
            >
              <div className="text-lg">{l.emoji}</div>
              {l.name}
            </div>
          ))}
        </div>
      </div>

      {/* Profile + preferences */}
      <form action={updateSettings} className="card space-y-4">
        <h2 className="font-semibold">Preferences</h2>
        <div>
          <label className="label" htmlFor="full_name">
            Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            defaultValue={profile?.full_name ?? ''}
            className="input"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="hourly_wage">
              Hourly wage
            </label>
            <input
              id="hourly_wage"
              name="hourly_wage"
              type="number"
              min="0"
              step="0.5"
              defaultValue={profile?.hourly_wage ?? 25}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="daily_vault_amount">
              Daily vault reward
            </label>
            <input
              id="daily_vault_amount"
              name="daily_vault_amount"
              type="number"
              min="0"
              step="0.5"
              defaultValue={profile?.daily_vault_amount ?? 5}
              className="input"
            />
          </div>
        </div>

        {/* Consequence Mode (Feature 10) */}
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
          <input
            type="checkbox"
            name="consequence_mode"
            defaultChecked={profile?.consequence_mode ?? false}
            className="mt-1 h-5 w-5 accent-brand-500"
          />
          <span>
            <span className="block font-medium">Consequence Mode</span>
            <span className="muted">
              When you log a session, you&apos;ll choose what the money could
              have bought instead.
            </span>
          </span>
        </label>

        <p className="muted">
          Your wage of {money(profile?.hourly_wage ?? 25)}/hr powers the
          &ldquo;hours worked&rdquo; calculations across the app.
        </p>

        <button className="btn-primary w-full py-3">Save preferences</button>
      </form>

      <form action={signOut}>
        <button className="btn-ghost w-full">Sign out</button>
      </form>

      <p className="muted text-center text-xs">
        If gambling is putting you or your family at risk, please reach out for
        support. In Australia, call Gambling Help on 1800 858 858 (24/7).
      </p>
    </div>
  );
}
