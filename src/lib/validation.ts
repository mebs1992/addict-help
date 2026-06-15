// Lightweight server-side validation + sanitisation for mutations.
// Pure, no I/O — every Server Action funnels untrusted FormData through these
// so a malformed or hostile value can't reach the database.

const MONEY_MAX = 100_000_000; // generous ceiling; guards against overflow/typos

export function toNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Non-negative money amount, finite and capped. */
export function amount(value: unknown, max = MONEY_MAX): number {
  return clamp(toNumber(value, 0), 0, max);
}

/** Trimmed text capped at `maxLen`, or null when empty. */
export function text(value: unknown, maxLen = 280): string | null {
  const s = String(value ?? '').trim();
  return s ? s.slice(0, maxLen) : null;
}

/** The value if it's one of `allowed`, else null. */
export function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  const s = String(value ?? '');
  return (allowed as readonly string[]).includes(s) ? (s as T) : null;
}

/**
 * Parse a datetime-local / ISO string into a stored ISO timestamp, clamped to a
 * sane window so a typo can't poison the data. Falls back to now().
 */
export function timestamp(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (raw) {
    const t = new Date(raw).getTime();
    if (Number.isFinite(t)) {
      const min = new Date('2000-01-01T00:00:00Z').getTime();
      const max = Date.now() + 86_400_000; // tolerate a day of clock skew
      return new Date(clamp(t, min, max)).toISOString();
    }
  }
  return new Date().toISOString();
}
