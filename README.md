# The Cost of One Spin 🎰

A mobile-first, dark-mode web app that helps **you** reduce poker machine
(slot) gambling through accountability, visible losses, a small controlled
budget, streaks and goal tracking.

> **Philosophy:** Not cold turkey. Allow a very small monthly budget. Reduce
> harm, build awareness, make gambling feel costly and visible — and celebrate
> every dollar **not** gambled.

> **Personal mode:** This is a single-user app with **no accounts or logins**.
> All data belongs to one fixed profile and lives in your own Supabase project,
> so it syncs across your phone and laptop and survives a browser wipe. The app
> reads/writes on the server using a secret service-role key that never reaches
> the browser.

Built with **Next.js (App Router) · TypeScript · Tailwind CSS · Supabase
(Postgres + Storage)** and deployable on **Vercel**.

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
| 13 | **Gamification** — XP for honest logging / budget / streaks; levels Taking Control → Financial Freedom | header + `/settings` |

---

## Project structure

```
the-cost-of-one-spin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (dark, Inter, viewport)
│   │   ├── globals.css               # Tailwind + design system classes
│   │   ├── page.tsx                  # Redirects to /dashboard
│   │   └── (app)/                    # App shell: header (level/XP) + bottom nav
│   │       ├── layout.tsx            # force-dynamic; runs syncProgress()
│   │       ├── dashboard/            # Budget meter, future self, snapshots
│   │       ├── budget/               # Feature 1 setup (+ live preview)
│   │       ├── check-in/             # Feature 2 form + result page
│   │       ├── opportunity-cost/     # Feature 3
│   │       ├── vault/                # Feature 4
│   │       ├── streak/               # Feature 5
│   │       ├── future-self/          # Feature 6 (server-side Storage upload)
│   │       ├── accountability/       # Feature 8
│   │       ├── reports/              # Feature 9 (charts)
│   │       ├── reality-check/        # Feature 11
│   │       └── settings/             # Features 10 & 13
│   ├── components/                   # BottomNav, EmergencyPause, BarChart, ui
│   └── lib/
│       ├── config.ts                 # PERSONAL_USER_ID (the single profile)
│       ├── calculations.ts           # Pure finance/behaviour math (testable)
│       ├── constants.ts              # Budget %, moods, opportunities, achievements, XP, levels
│       ├── types.ts                  # Domain types mirroring the schema
│       ├── data.ts                   # Server-side read queries
│       ├── actions.ts                # Server actions (mutations)
│       └── supabase/server.ts        # Service-role client (server only)
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql   # Tables, indexes, triggers
│   │   ├── 0002_rls_policies.sql     # Row Level Security
│   │   ├── 0003_storage.sql          # future-self image bucket
│   │   └── 0004_personal_single_user.sql  # Detach auth, seed the one profile
│   └── seed.sql                      # Optional rich demo data
├── docs/                             # WIREFRAMES.md, ARCHITECTURE.md
├── .env.example
└── package.json
```

---

## Go live — step by step (~15 min, free tier)

### 1. Create your Supabase project
1. At [supabase.com](https://supabase.com) → **New project**. Choose a name,
   a strong database password, and a nearby region. Wait ~2 min.
2. Open **SQL Editor → New query** and run the four migrations **in order**
   (paste each file, click Run):
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/migrations/0003_storage.sql`
   - `supabase/migrations/0004_personal_single_user.sql`
3. Go to **Project Settings → API** and copy two values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **`service_role` secret** (under *Project API keys*, click *Reveal*) →
     `SUPABASE_SERVICE_ROLE_KEY`

   > ⚠️ The `service_role` key is **secret**. Don't commit it or put it in any
   > `NEXT_PUBLIC_*` variable. It only ever runs on the server.

### 2. Deploy to Vercel
1. Push this repo to GitHub (it already is, on your working branch — merge to
   `main` or point Vercel at your branch).
2. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and
   **Import** the repo. It auto-detects Next.js — leave the defaults.
3. Expand **Environment Variables** and add both (Production + Preview):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | your `service_role` secret |

4. Click **Deploy**. You'll get a live URL like
   `https://your-app.vercel.app`.

### 3. Open it
Visit the URL — it goes straight to your dashboard. Set up your budget, log a
session, done. No sign-up, no password. (If you ever see an "Almost there"
notice, an env var is missing — re-check step 2 and redeploy.)

### 4. (Optional) Demo data
To preview a populated app, run `supabase/seed.sql` in the SQL Editor. To start
clean, skip it. Re-running it is safe (it resets demo sessions first).

### Custom domain
Add it under **Vercel → Settings → Domains**. No Supabase changes are needed
(there's no auth redirect to configure).

---

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill in URL + service-role key
npm run dev                  # http://localhost:3000
```

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```

---

## How the money math works (`src/lib/calculations.ts`)

- **Disposable income** = annual income ÷ 12 − monthly expenses.
- **Recommended budget** = disposable × budget% (default 1%), capped at your
  hard cap.
- **Hours worked** = amount ÷ hourly wage.
- **Invested value** = future value of investing the amount monthly for 10
  years at 7% p.a., compounded monthly.
- **Opportunity breakdown** = greedy split of total spend across a catalogue,
  most-aspirational first.
- **Vault / streak** = `syncProgress()` recomputes the current streak, longest
  streak, vault balance (gamble-free days × daily reward) and unlocks
  achievements — idempotently, on every app load.

---

## Security & privacy notes

- **No accounts.** One fixed profile (`PERSONAL_USER_ID` in `src/lib/config.ts`)
  owns all data. Everything is read/written on the server with the
  `service_role` key, which is **server-only** and never sent to the browser.
- Because there's no login, **anyone who knows your deployed URL can use it.**
  For a private personal tracker that's usually fine (the URL is unguessable),
  but if you want a lock you can add Vercel's password protection
  (Project → Settings → Deployment Protection) or put it behind an allowlist —
  no code changes needed.
- This app supports **harm reduction**; it is not medical advice. The UI
  surfaces the Australian Gambling Help line (1800 858 858) — localise as needed.
