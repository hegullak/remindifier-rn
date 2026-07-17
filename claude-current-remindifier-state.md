# remindifier-rn — Current AI Session State

*Last updated: 2026-07-17 (session — Flow/Day/Week restructure, Mental Forecast, full intentions loop, contact moments)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox` — **34 local commits ahead of origin, NOT pushed** (push only when user asks)
- **CI:** lint + typecheck + test:coverage — **452/452 tests passing**
- **EAS dev build:** fresh build made this session (`fef8871c…`, commit 5148efc) and installed on Henning's iPhone as the **echoflow** dev app. DB migrations 0004–0006 run automatically on app start (JS-only changes since; no rebuild needed).

### Git workflow (user rule)

1. Start every task: `git pull --rebase origin sandbox`
2. End every task: stage, commit; **push only when user asks**
3. Never commit: `.env`, `coverage/`, `expo-output.log`, `node_modules/`, `cal/` (now gitignored — user's private .ics exports live there)

---

## Product state after this session

**Three tabs: Flow / Day / Week** (`app/(tabs)/flow.tsx|day.tsx|week.tsx`). Flow is the default and the product's heart — a **Mental Forecast**, not a calendar summary. Day = operational single-day list (DayPickerHeader, past items struck through, training divider). Week = grouped look-ahead (WeekPickerHeader, collapsible, red-letter days, anniversary sheet). Old `brief.tsx` deleted; all redirects point to `/(tabs)/flow`. Shared row rendering in `src/features/brief/UnifiedItem(Row)`.

### Flow screen (design direction "A — Dagsbuen", chosen from three mockups)

Greeting (serif, follows DM/EM dev override) → **verdict** (one-line character of the day, 20px semibold) → stanzas **MORGEN / ETTERMIDDAG / KVELD / HELG** (14px white uppercase headings, 16px body) → companion lines (serif italic accent, below hairline divider).

- `src/lib/brief/flowStanzas.ts` — `buildFlowStanzas()`: verdict + stanzas from `analyzeDay` signals. **Names anchor events instead of counting** ("Kundemøte kl. 14:00, deretter tett fram til kl. 16:00", never "4 avtaler"). Weekend stanza from weekEvents ("Fri helg." or names Sat/Sun events). Evening period = tomorrow, verdict prefixed "I morgen: …".
- Old flat builders `morningBrief.ts`/`eveningWindDown.ts` + `flowSummary.ts` facade still exist (tested) but Flow no longer uses them.

### Intentions — the full companion loop (built this session)

Per the **capacity principle** (dread = capacity-uncertainty, not task effort; echoflow moves the capacity-check from user to system):

1. **Capture:** "+" menu → **«Noe å huske»** (`IntentionCaptureSheet`): text + optional talking points (one per line) + three vague horizon chips (I dag / Denne uken / Denne måneden — deliberately NO date picker; vagueness prevents self-negotiated postponement).
2. **Forward-scan:** `intentionWeave.ts` — `findIntentionWindow()` scans today→dueBy (clamped to week data) for the nearest calm day (`hasRoomForIntention`: ≤4 timed events, no back-to-back). Nearest calm day wins; silent when none.
3. **Surface:** `buildIntentionLine()` — today-phrasing ("Du kan vurdere om du skal … — du antydet at du skulle gjøre det denne uken") or forward-looking ("Torsdag ser rolig ut — kanskje dagen for å …") shown even on busy todays.
4. **Prepare/Resolve:** tap the line → sheet shows **talking points** ("Verdt å ta opp") → Gjort / Ikke nå.
5. **After-moment capture:** after Gjort the sheet flips to «Noe verdt å huske til neste gang?» → stored as `after_note`.
6. **Invisible threading:** `intentionThread.ts` — a new intention with matching normalized text automatically inherits the last after-note as talking points. No filing UI.
7. **Contact moments:** `contactMoments.ts` — person name extracted from event titles (capitalized word(s) after med/hos/with), matched against intention threads → "Før «Kveld med Ivan» i morgen — verdt å huske: …" as a second companion line. No persons-table dependency; max 3 points, notes never expire.

**DB:** `intentions` table — migrations `0004_silky_impossible_man` (table), `0005_hesitant_pestilence` (notes), `0006_eminent_annihilus` (after_note). All hand-mirrored into `src/db/drizzle/migrations.ts` (m0000-pattern). Repo: `src/db/repos/intentionsRepo.ts` (threading lookback 50 rows; `listCompletedAfterNotes` feeds contact moments via `useBriefData.afterNoteThreads`).

### Dev controls (header, `DevBriefControls`, __DEV__ only)

Mock (fills empty week days from user's own calendar history pool) · DM/EM (force morning/evening variant incl. greeting) · **Light/Med/Busy** (scenario override; same button rotates through 5 variants each, "Light·2" etc., 6th press = off) · +Int (seeds Berit intention WITH talking points) · ×Int (clears all).

### Other fixes this session

- `BottomSheet` got `KeyboardAvoidingView` (iOS keyboard covered inputs — affected all sheets with TextInputs).
- Floating tab bar slimmed (52px, softer shadow). i18n added NO+EN: `day.*`, `week.title`, `intentions.*`, `global.newIntention`, `day.periods.weekend`.

---

## Design principles (etched this session — full versions in Claude auto-memory)

1. **Capacity principle:** dreaded tasks aren't heavy — the recurring "do I have room?" self-check is. echoflow answers it for you (names the calm day in advance).
2. **Input contract:** the calendar IS the user's one job; everything else is derived (calendar + capture drops in natural moments). **Never onboarding questionnaires.**
3. **Being-seen principle:** being remembered is being seen; old notes appreciate (a question asked a year later is worth more). echoflow is a **discreet contributor** — private prep, never scoring/guilt/gamification; the other person must never sense a tool.
4. **Vague horizons by design** — no specific dates for self-chosen intentions (nothing to bargain down).

---

## Agreed next steps (in order)

1. **Dev time-travel clock** — `clock.now()` abstraction + "+1 day" dev button so the whole temporal loop (scan → surface → resolve → thread) is walkable in minutes. The key testing investment for a time-based product.
2. **Optional due date** for world-imposed deadlines (hekken før St. Hans) — reuses existing `dueBy`, capture UI gains opt-in date. Behaviour decided: **escalate presence, never tone** — near deadline (last ~2 days) it may appear even on busy days, same calm voice, one line; after deadline: silent expiry. Never reminder-app urgency (no colors/badges/repetition).
3. **TestFlight setup for Ivan** (willing live tester) — internal tester via App Store Connect. Dogfooding metric: do we open it voluntarily in week two + nightly "did it say anything true/false/actionable?"
4. **Parked:** job-calendar toggle (Settings placeholder exists — user's own feature, remind occasionally). **Sports fixtures module** (CL/Europa League/Eliteserien terminlister) — parked; if ever built, via **ICS calendar feeds** (time-data, passes the companion test) NOT in-app content (alt-mulig-app trap; weather was removed for the same reason); interpretation layer treats matches as joy ("Kvelden er rolig — og det er CL-kamp kl. 21").
5. Deferred: gap-window phrasing ("ettermiddagen er åpen fra 14:00"), persons-table enrichment, intake routing "Ivan nevnte at…" into threads, LLM voice fork (privacy tension — Henning's call).

---

## Known issues / pitfalls (carried forward)

| Problem | Notes |
|---|---|
| Expo Go can't read calendar | Use EAS dev build (echoflow app) |
| `migrations.ts` is hand-maintained | Mirror every new drizzle migration manually (m0000–m0006 pattern) |
| NativeWind TextInput on iOS | Use explicit `style` colors via `useAppTheme` (dictation invisibility) |
| Body text separator | `"\n"` between sentences, never ". " |
| Modal + theme | BottomSheet re-applies `themeClass` (Modal portal escapes ThemeProvider) |

---

*echoflow / remindifier — product name lowercase in UI.*
