# Component & Data Architecture

## Stack & rendering model

- **Next.js App Router** with **React Server Components by default**. Pages fetch
  data on the server (no client data-fetching libraries, no API layer to
  maintain). Interactive bits are small **Client Components** (`'use client'`).
- **Mutations are Server Actions** (`src/lib/actions.ts`, `auth-actions.ts`) —
  progressively-enhanced `<form action={...}>` with no hand-written API routes
  (except the OAuth/email `auth/callback` route handler).
- **Supabase** provides Auth, Postgres (with RLS) and Storage. Three client
  factories wrap `@supabase/ssr`:
  - `lib/supabase/client.ts` — browser (Client Components, Storage uploads).
  - `lib/supabase/server.ts` — Server Components / Actions / Route Handlers.
  - `lib/supabase/middleware.ts` — refreshes the session cookie every request
    and guards authenticated routes.

## Layered design

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation (RSC pages + Client Components)                 │
│   app/(app)/*  ·  components/*                               │
├─────────────────────────────────────────────────────────────┤
│ Application                                                  │
│   lib/data.ts      → read queries (server)                   │
│   lib/actions.ts   → write server actions + syncProgress()   │
│   lib/auth-actions → signIn / signUp                         │
├─────────────────────────────────────────────────────────────┤
│ Domain (pure, no I/O — unit-testable)                        │
│   lib/calculations.ts  ·  lib/constants.ts  ·  lib/types.ts  │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure                                               │
│   lib/supabase/*   ·  middleware.ts  ·  Supabase (DB/RLS)    │
└─────────────────────────────────────────────────────────────┘
```

The **domain layer is pure** — every money/streak/opportunity calculation lives
in `calculations.ts` and takes plain numbers, so it can be unit-tested without a
database and reused identically on server (pages) and client (live budget
preview).

## Server vs Client components

| Component | Type | Why |
|-----------|------|-----|
| All `app/(app)/*/page.tsx` | Server | Fetch user-scoped data via `lib/data` |
| `app/(app)/layout.tsx` | Server | Reads profile, runs `syncProgress()`, renders shell |
| `components/BottomNav` | Client | `usePathname()` for active tab |
| `components/EmergencyPause` | Client | 10-min timer, breathing rotation, calls action |
| `components/AuthForm` | Client | `useFormState`/`useFormStatus` for errors + pending |
| `check-in/CheckInForm` | Client | Mood/consequence pickers, submit state |
| `budget/BudgetPreview` | Client | Live recompute as the user types |
| `future-self/FutureSelfForm` | Client | Direct browser → Storage upload, then action |
| `components/ui`, `BarChart` | Server | Pure presentational, no interactivity |

## Data flow examples

**Logging a session (Feature 2 + 10)**
```
CheckInForm (client) --form action--> logGamblingSession (server action)
  → insert gambling_sessions (hours_worked computed from profile.hourly_wage)
  → update streaks (break run, recompute longest, set last_gamble_date)
  → award XP on profiles
  → revalidatePath('/', 'layout')  → redirect /check-in/result?amount=…
result page (server) reads sessions+budget → hours / invested / % over budget
```

**Every authenticated page load**
```
(app)/layout.tsx → syncProgress() (idempotent):
  current_streak = days since last gamble
  longest_streak = max(stored, current)
  vault_balance  = gamble-free days × daily_vault_amount
  unlock achievements for current streak (upsert, ignore dups)
```

## Database schema (overview)

`profiles` (1:1 `auth.users`, the "users" table) · `monthly_budgets` ·
`gambling_sessions` · `savings_goals` (also powers Future Self) · `achievements`
· `streaks` (holds the vault balance) · `accountability_entries` · `reports`.

- **RLS everywhere**: `auth.uid() = user_id` (`= id` for `profiles`). Generated
  by a `DO` loop in migration `0002` for the owner-scoped tables.
- **Triggers**: `set_updated_at` on mutable tables; `handle_new_user`
  provisions a `profiles` + `streaks` row when an auth user is created.
- **Storage**: a public `future-self` bucket, write-scoped to `<user_id>/…`.

See `supabase/migrations/` for the authoritative DDL and `src/lib/types.ts` for
the TypeScript mirror.

## Design system

Tailwind with a `dark` class on `<html>`. Reusable component classes live in
`globals.css` (`.card`, `.btn-primary`, `.input`, `.stat`, `.pill`…). The
palette (`ink`, `brand` green, `danger` red, `warn` amber) and animations
(`pop-in`, `pulse-ring`, `shimmer`) are defined in `tailwind.config.ts`. The red
`danger` treatment is reserved for over-budget and reality-check moments so it
keeps its weight.
