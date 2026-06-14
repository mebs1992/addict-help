# Component & Data Architecture

## Stack & rendering model

- **Next.js App Router** with **React Server Components by default**. Pages fetch
  data on the server (no client data-fetching libraries, no API layer to
  maintain). Interactive bits are small **Client Components** (`'use client'`).
- **Mutations are Server Actions** (`src/lib/actions.ts`) — progressively
  enhanced `<form action={...}>` with no hand-written API routes.
- **Personal mode (no auth).** All data belongs to one fixed profile
  (`PERSONAL_USER_ID` in `lib/config.ts`). A single server-side Supabase client
  (`lib/supabase/server.ts`) uses the secret **service-role key**, so reads and
  writes never depend on a logged-in user and the key never reaches the browser.

## Layered design

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation (RSC pages + a few Client Components)           │
│   app/(app)/*  ·  components/*                               │
├─────────────────────────────────────────────────────────────┤
│ Application                                                  │
│   lib/data.ts      → read queries (server)                   │
│   lib/actions.ts   → write server actions + syncProgress()   │
├─────────────────────────────────────────────────────────────┤
│ Domain (pure, no I/O — unit-testable)                        │
│   lib/calculations.ts · lib/constants.ts · lib/types.ts      │
│   lib/config.ts (PERSONAL_USER_ID)                           │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure                                               │
│   lib/supabase/server.ts (service role)  ·  Supabase (DB)    │
└─────────────────────────────────────────────────────────────┘
```

The **domain layer is pure** — every money/streak/opportunity calculation lives
in `calculations.ts` and takes plain numbers, so it can be unit-tested without a
database and reused identically on server (pages) and client (live budget
preview).

## Server vs Client components

| Component | Type | Why |
|-----------|------|-----|
| All `app/(app)/*/page.tsx` | Server | Fetch the profile's data via `lib/data` |
| `app/(app)/layout.tsx` | Server | `force-dynamic`; reads profile, runs `syncProgress()`, renders shell |
| `components/BottomNav` | Client | `usePathname()` for active tab |
| `components/EmergencyPause` | Client | 10-min timer, breathing rotation, calls action |
| `check-in/CheckInForm` | Client | Mood/consequence pickers, submit state |
| `budget/BudgetPreview` | Client | Live recompute as you type |
| `components/ui`, `BarChart` | Server | Pure presentational, no interactivity |

Note: `app/page.tsx` simply `redirect()`s to `/dashboard`. The Future Self photo
is uploaded **server-side** inside the `saveFutureSelf` action (the `<File>` is
sent through the form), so no browser Supabase client is needed.

## Data flow examples

**Logging a session (Feature 2 + 10)**
```
CheckInForm (client) --form action--> logGamblingSession (server action)
  → insert gambling_sessions (hours_worked from profile.hourly_wage)
  → update streaks (break run, recompute longest, set last_gamble_date)
  → award XP on profiles
  → revalidatePath('/', 'layout')  → redirect /check-in/result?amount=…
result page (server) reads sessions+budget → hours / invested / % over budget
```

**Every app page load**
```
(app)/layout.tsx → syncProgress() (idempotent):
  current_streak = days since last gamble
  longest_streak = max(stored, current)
  vault_balance  = gamble-free days × daily_vault_amount
  unlock achievements for current streak (upsert, ignore dups)
```

## Database schema (overview)

`profiles` (the single "user", id = `PERSONAL_USER_ID`) · `monthly_budgets` ·
`gambling_sessions` · `savings_goals` (also powers Future Self) · `achievements`
· `streaks` (holds the vault balance) · `accountability_entries` · `reports`.

- Migrations `0001`–`0003` define tables, RLS and the Storage bucket.
  Migration `0004` switches to personal mode: it drops the `profiles → auth.users`
  foreign key, removes the signup trigger, and inserts the one profile + streak.
- **RLS stays enabled** as defense in depth: the (now unused) anon key can read
  nothing, while the server's service-role key bypasses RLS by design.
- **Storage**: a public `future-self` bucket; images are written server-side
  under `<PERSONAL_USER_ID>/…`.

See `supabase/migrations/` for the authoritative DDL and `src/lib/types.ts` for
the TypeScript mirror.

## Design system

Tailwind with a `dark` class on `<html>`. Reusable component classes live in
`globals.css` (`.card`, `.btn-primary`, `.input`, `.stat`, `.pill`…). The
palette (`ink`, `brand` green, `danger` red, `warn` amber) and animations
(`pop-in`, `pulse-ring`, `shimmer`) are defined in `tailwind.config.ts`. The red
`danger` treatment is reserved for over-budget and reality-check moments so it
keeps its weight.
