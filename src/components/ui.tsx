import Link from 'next/link';
import type { ReactNode } from 'react';

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'danger' | 'brand' | 'warn';
  icon?: ReactNode;
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-danger-400'
      : tone === 'brand'
        ? 'text-brand-400'
        : tone === 'warn'
          ? 'text-warn-400'
          : 'text-slate-100';
  return (
    <div className="card-tight">
      <div className="flex items-center justify-between">
        <p className="muted">{label}</p>
        {icon ? <span className="text-lg">{icon}</span> : null}
      </div>
      <p className={`stat mt-1 ${toneClass}`}>{value}</p>
      {sub ? <p className="muted mt-1">{sub}</p> : null}
    </div>
  );
}

export function ProgressBar({
  pct,
  tone = 'brand',
}: {
  pct: number;
  tone?: 'brand' | 'danger' | 'warn';
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const bar =
    tone === 'danger'
      ? 'bg-danger-500'
      : tone === 'warn'
        ? 'bg-warn-500'
        : 'bg-brand-500';
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className={`h-full rounded-full ${bar} transition-all duration-700`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      {action}
    </div>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: 'danger' | 'brand' | 'warn';
  children: ReactNode;
}) {
  const styles =
    tone === 'danger'
      ? 'border-danger-500/40 bg-danger-500/10 text-danger-400'
      : tone === 'warn'
        ? 'border-warn-500/40 bg-warn-500/10 text-warn-400'
        : 'border-brand-500/40 bg-brand-500/10 text-brand-400';
  return (
    <div className={`rounded-2xl border p-4 text-sm font-medium ${styles}`}>
      {children}
    </div>
  );
}

export function LinkCard({
  href,
  emoji,
  title,
  desc,
}: {
  href: string;
  emoji: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="card-tight group flex items-center gap-3 transition hover:border-brand-500/40 hover:bg-ink-800/70"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-slate-100">{title}</span>
        <span className="muted block truncate">{desc}</span>
      </span>
      <span className="ml-auto text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-brand-400">
        →
      </span>
    </Link>
  );
}
