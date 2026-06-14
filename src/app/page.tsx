import Link from 'next/link';

const FEATURES = [
  { emoji: '🎯', title: 'A small, deliberate budget', desc: 'Not cold turkey — a tiny, visible monthly limit based on your real disposable income.' },
  { emoji: '🪞', title: 'Make the cost impossible to ignore', desc: 'Every dollar shown as hours worked, holidays missed, and what it could have become.' },
  { emoji: '🔥', title: 'Streaks & a reward vault', desc: 'Watch gamble-free days stack up and real savings grow. Celebrate every dollar not gambled.' },
  { emoji: '🆘', title: 'Emergency pause', desc: 'A ten-minute circuit breaker that shows your reasons, your streak, and your goal.' },
];

export default function LandingPage() {
  return (
    <main className="app-bg min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        <header className="flex items-center gap-2">
          <span className="text-2xl">🎰</span>
          <span className="font-semibold">The Cost of One Spin</span>
        </header>

        <section className="mt-12">
          <h1 className="text-4xl font-bold leading-tight">
            Make every spin
            <span className="text-brand-400"> cost something visible.</span>
          </h1>
          <p className="muted mt-4 text-base">
            A harm-reduction companion for poker machine gambling. We don&apos;t
            shame you and we don&apos;t demand perfection — we help you spend
            less, see the real cost, and celebrate every dollar you keep.
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link href="/signup" className="btn-primary py-3.5 text-base">
              Start taking control
            </Link>
            <Link href="/login" className="btn-ghost py-3.5 text-base">
              I already have an account
            </Link>
          </div>
        </section>

        <section className="mt-12 space-y-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card-tight flex gap-3">
              <span className="text-2xl">{f.emoji}</span>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="muted">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-auto pt-10 text-center">
          <p className="muted text-xs">
            Built on the philosophy of harm reduction. If gambling is putting you
            at risk, call Gambling Help 1800 858 858 (AU, 24/7).
          </p>
        </footer>
      </div>
    </main>
  );
}
