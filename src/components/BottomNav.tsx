'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/reports', label: 'Reports', icon: '📊' },
  { href: '/check-in', label: 'Log', icon: '➕', center: true },
  { href: '/streak', label: 'Recovery', icon: '🔥' },
  { href: '/settings', label: 'You', icon: '⚙️' },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + '/');
          if (item.center) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-2xl text-ink-950 shadow-lg shadow-brand-500/30 active:scale-95"
              >
                {item.icon}
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] ${
                active ? 'text-brand-400' : 'text-slate-400'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
