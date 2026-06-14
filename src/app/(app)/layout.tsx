import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BottomNav } from '@/components/BottomNav';
import { getProfile } from '@/lib/data';
import { syncProgress } from '@/lib/actions';
import { levelForXp } from '@/lib/calculations';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <main className="app-bg flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <h1 className="text-xl font-bold">Almost there</h1>
          <p className="muted mt-2">
            Supabase isn&apos;t configured yet. Add{' '}
            <code className="text-brand-400">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code className="text-brand-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            to your environment, then reload. See the README for setup.
          </p>
        </div>
      </main>
    );
  }

  const profile = await getProfile();
  if (!profile) redirect('/login');

  // Keep streak, vault and achievements current on every visit.
  await syncProgress();

  const { current, next, progressPct } = levelForXp(profile.xp);

  return (
    <div className="app-bg min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl">🎰</span>
            <span className="text-sm font-semibold leading-tight">
              The Cost of
              <br />
              One Spin
            </span>
          </Link>
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
          >
            <span>{current.emoji}</span>
            <span className="text-right">
              <span className="block text-xs font-semibold leading-none">
                {current.name}
              </span>
              <span className="block text-[10px] leading-none text-slate-400">
                {profile.xp} XP{next ? ` · ${next.minXp - profile.xp} to go` : ''}
              </span>
            </span>
          </Link>
        </div>
        <div className="h-1 w-full bg-white/5">
          <div
            className="h-full bg-brand-500/70 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-28 pt-4">{children}</main>

      <BottomNav />
    </div>
  );
}
