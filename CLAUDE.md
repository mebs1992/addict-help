# CLAUDE.md

Guidance for working in this repo. Keep it current when architecture, conventions, or key logic change.

## Project
**The Cost of One Spin** — a mobile-first, single-user gambling **harm-reduction** web app. Non-judgemental tone: make every dollar visible, reward clean days, surface real-world cost, provide an in-the-moment circuit breaker. Currency is AUD (`en-AU`, whole dollars).

## Commands
```bash
npm run dev        # local dev server
npm run build      # production build (also runs eslint)
npm run typecheck  # tsc --noEmit
npm run lint       # next lint
```
There is **no test suite** yet. `calculations.ts` is pure and the natural place to add one.

### Verifying changes (no live DB needed)
Build, then run with placeholder Supabase env vars and curl the routes — the data layer swallows query errors, so pages render with empty/default data and you can confirm there's no render crash:
```bash
npm run build
NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=fake.key \
PORT=3100 npm run start &   # then curl http://localhost:3100/<route>
```
For pure-logic changes, sanity-check formulas with a quick `node -e` replica.

## Architecture
- **Next.js 14 App Router + TypeScript + Tailwind.** Server-centric: pages are async Server Components reading Supabase directly; mutations are Server Actions (`'use server'`) in `src/lib/actions.ts`. Minimal client JS.
- **Supabase Postgres** via the **service-role key** (server-only). Single-user **personal mode**: all data belongs to one fixed UUID (`PERSONAL_USER_ID` in `src/lib/config.ts`). The service role **bypasses RLS** — the RLS/storage policies in migrations 0002/0003 are dormant leftovers from an earlier multi-user design.
- `src/lib/supabase/server.ts` builds the client and exposes `isSupabaseConfigured()`. The `(app)/layout.tsx` shows an "Almost there" screen when env vars are missing, runs `syncProgress()` on every load, and renders the header (level/XP) + bottom nav.

## Where things live
| Concern | File |
|---|---|
| Pure logic / formulas (unit-testable, no I/O) | `src/lib/calculations.ts` |
| Mutations (server actions) | `src/lib/actions.ts` |
| Read queries | `src/lib/data.ts` |
| Tunable numbers + catalogues | `src/lib/constants.ts` |
| Domain types (mirror DB) | `src/lib/types.ts` |
| UI primitives | `src/components/ui.tsx` (StatCard, ProgressBar, Banner, LinkCard, SectionHeader) |
| Pages | `src/app/(app)/<feature>/page.tsx` |
| DB schema | `supabase/migrations/000N_*.sql` (+ `seed.sql`) |

## Core domain logic (constants in `constants.ts`)
- **Guardrails (the "budget"):** `disposable = max(0, monthly_income − monthly_expenses)`. Safe limit = **1%** of disposable (green), hard ceiling = **3%** (red), caution between. `guardrailsFor()` + `spendZone()`. Disposable ≤ 0 ⇒ any spend is `danger`. Persisted per month in `monthly_budgets` (`recommended_budget` = safe limit, `max_budget` = ceiling).
- **Exposure risk:** `accessible = spendings + savings`, `protected = offset`. Level by `accessible / disposable`: ≥6 months high, ≥2 moderate, else low (fallback when disposable 0: ≥$10k / ≥$2k). `exposureRisk()`.
- **Streak/vault (date-based, recomputed in `syncProgress` every load):** `current_streak` = days since `last_gamble_date` (or since `streak_start_date`). `vault_balance` via `vaultBalance()` = gamble-free days × daily ($5), but the first `RECOVERY_REDUCED_VAULT_DAYS` (3) after a slip earn at `RECOVERY_VAULT_RATE` (50%). **Not logging = assumed clean day.**
- **Daily affirmation:** `logCleanDay()` ("I didn't gamble today") awards XP once/day via `profiles.last_clean_checkin`; does NOT affect the streak.
- **Urge tracking (Phase 1, Feature 7.4):** `logUrge()` records an `urge_logs` row (intensity 0–10 + trigger) — naming a craving instead of acting on it. Page at `/urge`, surfaced on the dashboard; `summariseUrges()` is the pure roll-up. Awards XP for honesty.
- **Pre-commitment risk gate (Phase 1, Feature 7.1):** `RiskGate` (client, mounted in `(app)/layout.tsx`) takes over the whole screen during user-defined `profiles.high_risk_windows` while `risk_gate_enabled`. Only three exits: a delayed "I'm safe", a 10-min pause (reuses `EmergencyPause`), or "Call support". Window membership is evaluated client-side against the device clock via `activeRiskWindow()`; `recordRiskEvent()` logs the outcome to `risk_events`. Configured on Settings. Layout fetches pause context (`getEmergencyPauseContext()`) only when the gate is armed.
- **Pre-confirmation spend simulation (Phase 1, Feature 7.3):** `CheckInForm` is a two-step client flow — inputs, then a cost preview (hours worked, invested value, opportunity items) shown *before* anything is logged, with Proceed / Pause 10 min / Log urge instead. `EmergencyPause` now supports a controlled `open`/`onOpenChange`/`hideTrigger` so the gate and check-in can drive it.
- **Recovery Mode (Phase 2, Feature 7.2):** a slip opens a supportive `RECOVERY_WINDOW_DAYS` (7) window instead of a shame reset — *derived* from `last_gamble_date` (no stored flag, like streak/vault). `recoveryStatus()` drives banners on the dashboard / streak / vault / check-in-result; the vault's gentle rate (above) is its mechanical half. `rotatingMessage(RECOVERY_MESSAGES)` advances daily (light Feature 7.6).
- **Composite behaviour model (Phase 2, §8):** `behaviourModel()` blends recovery consistency, urge awareness and days-since-slip into a 0–100 `stabilityIndex` (+ band label). Pure; surfaced as the dashboard "Behavioural stability" teaser and on `/insights`.
- **Behavioural insight engine (Phase 2, Feature 7.5):** pure roll-ups over Phase-1 data — `riskTimeWindows()` (DAY_PARTS buckets), `rankTriggers()`, `moodSpendBreakdown()`. Live-computed on `/insights` (no cache table); gated behind `INSIGHT_MIN_EVENTS`.
- **XP awarded:** log session 15, clean day 10, urge log 15, risk-gate "safe" 15, accountability entry 20, emergency pause 50. **Levels:** 0 / 250 / 750 / 2000.
- **Achievements:** streak ≥ {3,7,30,90,180,365} days. **Emergency pause:** 10 min. **Invested projection:** 7%/yr, 10 yrs, monthly compounding.
- **Timezone:** Phase 1 logic resolves "what day/time is it" through `APP_TIMEZONE` (Australia/Sydney) via `zonedParts()`/`zonedDayKey()`. Legacy `dayKey`/`monthKey` remain local-time (unchanged) — don't mix the two in one comparison.

## Database workflow
Migrations are applied **manually** in the Supabase SQL Editor, in order (see README). When adding columns: create a new `000N_*.sql` (use `add column if not exists`), update `types.ts`, the relevant action/query, `seed.sql`, and the README migration list. The app self-heals missing `profiles`/`streaks` rows but **not** missing columns.

## Gotchas (learned the hard way)
- **Never pass a function as a prop from a Server Component to a Client Component** — it throws "Functions cannot be passed directly to Client Components" → production "server-side exception". Import shared helpers (e.g. `money`) directly inside the client component instead.
- **No dynamically-constructed Tailwind classes** (`` `text-${tone}-400` ``) — Tailwind can't see them at build time. Use explicit conditional full class strings.
- **Apostrophes/HTML entities**: `&apos;` only works in JSX text, not inside a plain JS string literal.
- **Timezones are inconsistent**: `monthKey`/`dayKey` use local time; some session dates use `toISOString()` (UTC). Be deliberate to avoid off-by-one-day bugs.
- Read queries in `data.ts` intentionally ignore Supabase errors (return defaults), so a missing table/column degrades quietly rather than crashing.

## Known gaps (don't assume these work)
- No UI to create/edit **savings goals** (`saveGoal` exists, nothing calls it) — yet goals power Future Self + Emergency Pause.
- `reports` table + `MonthlyReport` type are **unused** (Reports page recomputes live).
- `XP.WITHIN_BUDGET_MONTH` and `XP.REVIEW_REPORT` are defined but **never awarded**.
- Legacy `profiles.annual_income` column is unused.
- No tests, no auth/rate-limiting (single-user, service-role).
- **Phases 1 & 2 of the behavioural spec are built.** Phase 1: risk gate 7.1, spend simulation 7.3, urge tracking 7.4. Phase 2: Recovery Mode 7.2, behavioural insight engine 7.5, composite behaviour model §8 (all *derived* from existing tables — **no new migration** in Phase 2). Still TODO from Part B: full future-self rotating messaging (7.6 — only the recovery banner rotates so far) and the §10 engineering items (server-side rate limiting; finishing the global Sydney-timezone migration — legacy `dayKey`/`monthKey` are still local-time). The clean-day button was **kept** (not replaced) alongside urge tracking; Recovery Mode **layers on** the streak system rather than removing it.

## Conventions
- Match surrounding style: 2-space indent, single quotes, functional components, server-first.
- Keep new pure logic in `calculations.ts`; keep mutations in `actions.ts`; after mutations call `revalidatePath(...)`.
- Run `npm run typecheck` and `npm run build` before considering a change done.

## Git
Develop on the assigned feature branch; commit with clear messages; push with `git push -u origin <branch>`. Do not open PRs unless asked.
