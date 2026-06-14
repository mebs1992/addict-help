# UI Wireframes — The Cost of One Spin

Mobile-first (max content width ≈ `28rem` / 448px), dark mode, sticky header
with level/XP, floating "Log" action and a 5-item bottom tab bar. ASCII below
approximates each screen.

## Global shell (authenticated)

```
┌─────────────────────────────────┐
│ 🎰 The Cost of   🧭 Taking Control│  ← sticky header: brand + level/XP
│    One Spin         310 XP · …   │
│ ▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← XP progress bar
├─────────────────────────────────┤
│                                 │
│           PAGE CONTENT          │
│                                 │
├─────────────────────────────────┤
│  🏠      📊     (➕)    🔥     ⚙️ │  ← bottom nav, center = log
│ Home  Reports  Log  Streak  You │
└─────────────────────────────────┘
```

## 1 · Landing (public `/`)

```
🎰 The Cost of One Spin
Make every spin cost something visible.
[ harm-reduction pitch copy ]
[ Start taking control ]   (primary)
[ I already have an account ]
🎯 small budget · 🪞 visible cost · 🔥 streaks · 🆘 pause
Gambling Help 1800 858 858
```

## 2 · Auth (`/login`, `/signup`)

```
🎰 The Cost of One Spin
Welcome back / Start taking control
┌ card ─────────────────┐
│ [Name]   (signup only)│
│ [Email]               │
│ [Password]            │
│ ⚠ error / ✓ message   │
│ [ Sign in / Create ]  │
│ link to other mode    │
└───────────────────────┘
```

## 3 · Dashboard (`/dashboard`)

```
Welcome back, Alex 👋

⚠ over-budget? → red bordered card + [acknowledge] button
┌ Allowance ───────────────────────┐
│ $18 / $23           [$5 left]     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  (green/red)   │
│ You have used $18 of your $23…    │
└───────────────────────────────────┘
┌ Future self (photo) ──────────────┐
│ [           image            ]    │
│ "My kids' first overseas trip…"   │
└───────────────────────────────────┘
[This year $216][Vault $45]
[Streak 3d   ][Lifetime $298]
┌ Opportunity cost ─────────────────┐
│ You've spent enough this year to: │
│ ✈️ 0 · 🏝️ 0 · 🏕️ 0 weekend …      │
└───────────────────────────────────┘
[ ➕ I Gambled Today ]      (primary)
[ 🆘 I Feel Like Gambling ] (red, pulsing)
→ Reality Check / Vault / Streak / Wall / Report / Budget
```

## 4 · Budget setup (`/budget`)  — Feature 1

```
Your monthly plan
Current recommended allowance  $23
┌ form ────────────────────────────┐
│ Annual income      [ 78000 ]     │
│ Monthly expenses   [ 4200  ]     │
│ Savings goal       [ 8000  ]     │
│ Budget %  [1.0]   Hard cap [25]  │
│ Hourly wage        [ 32 ]        │
│ ┌ live preview ───────────────┐  │
│ │ Recommended allowance  $23  │  │
│ └─────────────────────────────┘  │
│ [ Save my plan ]                 │
└──────────────────────────────────┘
```

## 5 · Check-in (`/check-in`) — Features 2 & 10

```
I gambled today
┌ form ────────────────────────────┐
│ Amount  $[  18.00  ] (big)       │
│ Venue [Local RSL]  When [picker] │
│ Mood before  😐🌤️😣🤩🥺😠😶😔😮‍💨😞   │
│ Mood after   (same grid)         │
│ ┌ Consequence Mode (if on) ────┐ │
│ │ What did this give up?       │ │
│ │ 🍽️ ⛽ 🏦 🏠 🏝️ 🧒 🧾 ❤️‍🩹      │ │
│ └──────────────────────────────┘ │
│ [ Log it honestly ]              │
└──────────────────────────────────┘
```

### Check-in result (`/check-in/result`)

```
🫶 Logged. Thank you.
You worked  1.1 hours  for the $18 you spent.
Invested monthly for 10 years ≈  $3,118
That's about 🍝 one family dinner
This month you're now  22% under budget
"One session does not erase your progress."
[ Back to home ] [ Read my reasons ]
```

## 6 · Opportunity cost (`/opportunity-cost`) — Feature 3

```
This year you've spent enough to buy:
🏕️ 0 × weekend getaway …
Across everything you've logged: …
Exchange rate grid: ⛽$80 🍝$50 🎮$90 …
```

## 7 · Vault (`/vault`) — Feature 4

```
Reward vault 🏦
        $45            (big)
from 9 gamble-free days
Progress toward a full year  [2%] ▓░░░░
"…you'll save approximately $1,825 this year."
[Current streak 3d][Daily reward $5]
```

## 8 · Streak (`/streak`) — Feature 5

```
   3            9
current      longest
Next: 🔥 One Week Strong   3/7 days  ▓▓▓▓░░░
Achievements (3-col grid)
🌱 ✓   🔥 ✓   🔒
3d     7d     30d
🔒     🔒     🔒
90d   180d   365d
```

## 9 · Future self (`/future-self`) — Feature 6

```
Future self
[        uploaded image        ]
"caption over gradient"
"Your next gambling session costs progress toward this goal."
[ file upload ] [ caption textarea ] [ Save ]
```

## 10 · Emergency pause (overlay) — Feature 7

```
█████ full-screen, can't dismiss until 0 █████
Take a breath. Stay with this for
            9:58
"This urge is a wave. It rises, peaks, passes."
[This month -$18][Streak 3d]
Saving for: Japan ▓▓▓░░  $1,850/$8,000
Why you wanted to stop:
 "I want to be present for my kids…"
[ Please wait — the timer is protecting you ] (disabled)
→ at 0:00: "+50 XP" + [ I'm okay now ]
```

## 11 · Accountability wall (`/accountability`) — Feature 8

```
Accountability wall 🧱
💚 Why I want to stop   [textarea][Add]
   "quote" ✕
🔻 My worst gambling loss …
⚖️ What gambling has cost me …
```

## 12 · Reports (`/reports`) — Feature 9

```
Monthly report 📊
✓ "You saved $X vs your previous average"
┌ last 6 months bar chart ─────────┐
│  ▁  ▃  █  ▅  ▂  ▁   (red if over)│
│  ─ ─ ─ dashed allowance line ─ ─ │
└──────────────────────────────────┘
[Total $18][Days 1][Biggest $18][Budget ✅]
Month-by-month list…
```

## 13 · Reality check (`/reality-check`) — Feature 11

```
Reality check 🪞
┌ RED ─────────────────────────────┐
│ Total lifetime losses            │
│         $298                      │
│ 9 hours · 1.2 full working days  │
└──────────────────────────────────┘
[This year][Largest][Average][Hours]
```

## 14 · Settings / You (`/settings`) — Features 10 & 13

```
You · email
Level 2 🛡️ Building Discipline   [310 XP]
▓▓▓▓▓▓░░░  · 440 XP to 💰
🧭 🛡️ 💰 🕊️  (level ladder)
Preferences: name / hourly wage / daily vault
☑ Consequence Mode
[ Save preferences ]
[ Sign out ]
Gambling Help 1800 858 858
```
