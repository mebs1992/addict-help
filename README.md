# The Cost of One Spin 🎰

A mobile-first, dark-mode web app that helps people **reduce poker machine
(slot) gambling** through accountability, visible losses, a small controlled
budget, streaks and goal tracking.

> **Philosophy:** Not cold turkey. Allow a very small monthly budget. Reduce
> harm, build awareness, make gambling feel costly and visible — and celebrate
> every dollar **not** gambled.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Supabase
(Auth + Postgres + Storage)** and deployable on **Vercel**.

---

## Features

| # | Feature | Where |
|---|---------|-------|
| 1 | **Monthly gambling budget** — 1% of disposable income, user-capped; screen turns red & requires acknowledgement when exceeded | `/budget`, `/dashboard` |
| 2 | **Gambling check-in** — "I Gambled Today" → amount, venue, time, mood before/after, then hours-worked / invested-value / over-budget feedback | `/check-in` |
| 3 | **Opportunity cost dashboard** — converts spend into real things (games, getaways, flights) | `/opportunity-cost` |
| 4 | **Savings reward vault** — +$ for every gamble-free day, projected yearly savings | `/vault` |
| 5 | **Streak system** — current / longest streak + 3d→1yr achievements | `/streak` |
| 6 | **Future self** — upload a family / goal photo with a motivating caption | `/future-self` |
| 7 | **Emergency pause** — "I Feel Like Gambling" → 10-minute timer showing losses, streak, goal & reasons | floating button on `/dashboard` |
| 8 | **Accountability wall** — reasons to stop, worst loss, what it cost | `/accountability` |
| 9 | **Monthly report** — totals, days gambled, biggest loss, compliance, vs-previous trend + charts | `/reports` |
| 10 | **Consequence mode** — optional; categorise what each spend gave up | toggle in `/settings`, applied in `/check-in` |
| 11 | **Reality check** — lifetime losses, hours worked, average / largest loss, yearly total | `/reality-check` |
| 12 | **Positive reinforcement** — direct, factual, never insulting copy throughout | everywhere |
| 13 | **Gamification** — XP for honest logging / budget / streaks / reviewing reports; levels Taking Control → Financial Freedom | header + `/settings` |

---

## Project structure

```
the-cost-of-one-spin/
├── src/
│   ├── middleware.ts                 # Supabase session refresh + route guard
│   ├── app/
│   │   ├── layout.tsx                # Root layout (dark, Inter, viewport)
│   │   ├── globals.css               # Tailwind + design system classes
│   │   ├── page.tsx                  # Public landing page
│   │   ├── (auth)/                   # login / signup (+ shared layout)
│   │   ├── auth/callback/route.ts    # Email-confirmation / OAuth callback
│   │   └── (app)/                    # Authenticated app shell (bottom nav)
│   │       ├── layout.tsx            # Header (level/XP) + syncProgress()
│   │       ├── dashboard/            # Budget meter, future self, snapshots
│   │       ├── budget/               # Feature 1 setup (+ live preview)
│   │       ├── check-in/             # Feature 2 form + result page
│   │       ├── opportunity-cost/     # Feature 3
│   │       ├── vault/                # Feature 4
│   │       ├── streak/               # Feature 5
│   │       ├── future-self/          # Feature 6 (Storage upload)
│   │       ├── accountability/       # Feature 8
│   │       ├── reports/              # Feature 9 (charts)
│   │       ├── reality-check/        # Feature 11
│   │       └── settings/             # Features 10 & 13 + sign out
│   ├── components/                   # BottomNav, EmergencyPause, BarChart, ui, AuthForm
│   └── lib/
│       ├── calculations.ts           # Pure finance/behaviour math (testable)
│       ├── constants.ts              # Budget %, moods, opportunities, achievements, XP, levels
│       ├── types.ts                  # Domain types mirroring the schema
│       ├── data.ts                   # Server-side read queries
│       ├── actions.ts                # Server actions (mutations)
│       ├── auth-actions.ts           # signIn / signUp
│       └── supabase/                 # client / server / middleware factories
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql   # Tables, indexes, triggers
│   │   ├── 0002_rls_policies.sql     # Row Level Security + new-user trigger
│   │   └── 0003_storage.sql          # future-self image bucket + policies
│   └── seed.sql                      # Demo data for demo@costofonespin.app
├── docs/
│   ├── WIREFRAMES.md                 # ASCII wireframes for every screen
│   └── ARCHITECTURE.md               # Component & data architecture
├── .env.example
└── package.json
```

---

## Getting started (local)

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run the migrations **in order**:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_storage.sql`

   (Or use the Supabase CLI — see below.)

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in from **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In **Authentication → URL Configuration**, add `http://localhost:3000/auth/callback`
as a redirect URL. For frictionless local testing you can also disable
"Confirm email" under **Authentication → Providers → Email**.

### 4. Run

```bash
npm run dev
```

Open <http://localhost:3000>, create an account, and the `handle_new_user`
trigger provisions your `profiles` + `streaks` rows automatically.

### Optional: Supabase CLI workflow

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push          # applies everything in supabase/migrations
```

### Optional: seed demo data

1. **Authentication → Users → Add user**: `demo@costofonespin.app` (any password).
2. Run `supabase/seed.sql` in the SQL Editor. It populates a realistic month of
   sessions, goals, accountability entries, a streak and achievements.

---

## Deploying to Vercel

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com/new), **Import** the repo (framework
   auto-detects as Next.js).
3. Add **Environment Variables** (Production + Preview):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |
   | `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

4. **Deploy.**
5. Back in Supabase → **Authentication → URL Configuration**:
   - Set **Site URL** to your Vercel URL.
   - Add `https://your-app.vercel.app/auth/callback` to **Redirect URLs**.

That's it — the app is serverless-ready (server components, server actions and
middleware all run on Vercel's Node/Edge runtimes). The build succeeds even
before env vars are set; protected routes simply show a setup notice until
Supabase is configured.

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## How the money math works (`src/lib/calculations.ts`)

- **Disposable income** = annual income ÷ 12 − monthly expenses.
- **Recommended budget** = disposable × budget% (default 1%), capped at the
  user's hard cap.
- **Hours worked** = amount ÷ hourly wage.
- **Invested value** = future value of investing the amount monthly for 10
  years at 7% p.a., compounded monthly.
- **Opportunity breakdown** = greedy split of total spend across a catalogue,
  most-aspirational first (so it reads "1 holiday + 2 weekends", not "40 dinners").
- **Vault / streak** = `syncProgress()` recomputes the current streak (days
  since last gamble), longest streak, vault balance (gamble-free days × daily
  reward) and unlocks achievements — idempotently, on every app load.

---

## Security & safety notes

- Every table has **Row Level Security**; users can only ever read/write their
  own rows (`auth.uid() = user_id`). The anon key is therefore safe in the
  browser.
- Future-self images live in a public Storage bucket but are write-scoped to
  `"<user_id>/..."` paths.
- This app supports **harm reduction**; it is not medical advice. The UI surfaces
  the Australian Gambling Help line (1800 858 858). Localise as needed.
```
