# remindifier-rn — Current AI Session State

*Last updated: 2026-05-29 — auto-loaded via Cursor rules + `.cursor/hooks/session-start.js`*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `bc7e17d` — `fix(ux): clearer plus icons + kind picker auto-close + safe area bottom`
- **CI:** lint + typecheck + test:coverage (expected green)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`**
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes (as of last save)

Modified (not committed): `gather/[id].tsx`, `gather/index.tsx`, `gather/new.tsx`, `people/[id].tsx`, `people/[id]/edit.tsx`, `people/new.tsx`

---

## Vision (short)

**Samvittighet-as-a-Service** — opened every morning. Contextual memory + heads-up for people who matter. Not a CRM, not social, not guilt.

- **Event-driven**, not form-driven — profiles grow through events
- **Opportunity**, not failure — never shame for lost contact
- **Local-first, privacy-first** — SQLCipher on device; Clerk auth only; no analytics SDKs
- Always write **remindifier** lowercase

Planned: CloudKit sync (user's iCloud only) — not started.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 / React 19 |
| Navigation | expo-router (tabs + stacks) |
| Auth | `@clerk/clerk-expo` |
| Database | `expo-sqlite` + SQLCipher |
| ORM | Drizzle |
| Styling | NativeWind v4 — Lora + DM Sans |
| AI (user-initiated) | GPT-4o-mini via OpenAI structured outputs |
| Calendar | expo-calendar → brief «Uken min» |
| Weather | Open-Meteo + expo-location |
| Haptics | expo-haptics (recent UX pass) |
| Logging | react-native-logs + expo-file-system (local only) |
| Testing | Jest (~183 tests, 20 suites) |
| Lint/format | Biome 2.4.16 |

**Expo docs:** https://docs.expo.dev/versions/v56.0.0/

---

## App Structure

### Tabs (4)

| Tab | Route | Purpose |
|---|---|---|
| ☀️ Brief | `(tabs)/brief.tsx` | Draggable morning sections |
| 🌿 Events | `(tabs)/gather/` | Gatherings + talking points |
| 👤 People | `(tabs)/people/` | Person library |
| 🪪 Myself | `(tabs)/myself.tsx` | Profile + QR |

Other: `sign-in`, `onboarding`, `settings`, `me-scan`, `sso-callback`

### Brief sections

Weather · Dagens program · Uken min (calendar, Mon–Sun + week nav) · Heads-up · Trening · Merkedager denne uken

- `useBriefData.ts` — `weekOffset`, gatherings enrichment
- Schedule/calendar rows **clickable** → event or `/gather/new?prefill=…` via `briefLinks.ts`
- Demo schedule `s1` localized → «Middag hos Ida» (NO)

### Events (gatherings)

- `gather/index.tsx` — list
- `gather/new.tsx` — natural language → `eventParser.ts` (GPT-4o-mini)
- `gather/[id].tsx` — detail, talking points, participants
- Kinds: **Spør, Tema, Small-talk, Heads-up** (`talkingPoints.ts`)
- Mac-style kind picker pops **upward** from +; + again closes when empty
- Demo `g-1` title localized via `localizeGathering.ts` + i18n `gathering.demo.g1`
- Person chips link with `returnTo=/gather/[id]`; person screen shows breadcrumb back

### People

- Natural language intake → `naturalLanguageParser.api.ts` (GPT-4o-mini)
- Local fallback parser + privacy notice
- Merkedager with Norwegian wedding names (`anniversaries.ts`, bryllupsdagen.no)
- Relevance hints in people list (recent)
- Event nudge after onboarding parse (`EventNudgeSheet`)

### Key lib paths

```
src/lib/brief/          calendarEvents, calendarWeek, weather, greeting
src/lib/gatherings/     eventParser, talkingPoints, briefLinks, localizeGathering
src/lib/people/         naturalLanguageParser.*
src/lib/timeline/       birthdays, red-letter-days
src/lib/milestones/     anniversaries
src/db/repos/           peopleRepo, briefRepo, gatheringsRepo, userRepo, …
```

---

## Recent commits (newest first)

```
bc7e17d fix(ux): clearer plus icons + kind picker auto-close + safe area bottom
4be9f8e fix(ux): haptic debug logging + better animations + keyboard background
7567268 feat(ux): haptic feedback + micro-animations + auto-dismiss
bb32543 fix(ux): tame keyboard — remove autoFocus, blurOnSubmit
76da7e1 feat: relevance hints in people list, dynamic seed data, kind-picker overlay
4634ecc feat: brief-to-event navigation, Mac-style kind picker, localized titles
65fd42c feat: events tab with AI prep, talking points, wedding anniversary names (#58, #50)
34e0833 feat: connect remindifier calendar to morning brief (#61)
```

---

## Test Coverage

- **20 test suites, ~183 tests** — all passing (last known run)
- Location: `src/lib/__tests__/`, `src/features/auth/__tests__/`
- Notable new: `briefLinks.test.ts`, `talkingPoints.test.ts`, `eventParser.test.ts`, `calendarEvents.test.ts`, `calendarWeek.test.ts`
- Thresholds enforced in CI via `npm run test:coverage`
- **`@shopify/flash-list` 2.0.2** — no `estimatedItemSize` prop

---

## Security Status

### Fixed ✅
- `.env` gitignored; no server secrets in RN app
- Log files excluded from data export
- `logger` instead of `console.error` in bootstrap/brief
- Clerk JWT keychain: `WHEN_UNLOCKED`

### Remaining (minor)
- Hagavik hardcoded weather fallback
- No QR payload field length limits
- Log rotation deletes whole file
- Dead `body_encrypted` column in schema

---

## Open GitHub Issues / next work

| # | Title | Status |
|---|---|---|
| 61 | Calendar in morning brief | ✅ Done |
| 58 | Events tab + AI prep | ✅ Mostly done |
| 50 | Tonight mode — expanded card before meeting | Not started |
| 52 | Apple Reminders + deep link to event prep | Not started |
| 53 | Me profile + QR | Partially done (`myself.tsx`) |
| 54 | Settings privacy/export/delete | Partially done |
| — | CloudKit sync | Not started |
| — | Icons over text for actions app-wide | User preference, partial |
| — | Training labels (Push/Pull/Legs) i18n | Not done |

---

## User Preferences (recurring)

- **Session memory** → update `claude-current-remindifier-state.md` (never ad-hoc files like `AI_PROJECT_CONTEXT.md`)
- **Pull before / push after** each agent task
- **Icons for actions** (✎, 🗑, ✦) — less button text
- **Norwegian bryllupsdager** — traditional names, not English calques
- **Monday–Sunday** week navigation on brief
- Use **`logger`**, not `console.log`

---

## Privacy / Architecture (non-negotiable)

- Local-first, SQLCipher per user
- No Sentry/Bugsnag/Amplitude
- No PII in logs
- AI only on user action; privacy notice first use
- QR = local JSON, no server

---

## What Was Done (recent sessions, summary)

1. **Events tab** — gatherings, GPT event parser, talking point kinds, participants
2. **Calendar brief (#61)** — expo-calendar, week bounds/offset, seed calendar refresh in settings
3. **Brief ↔ events** — clickable schedule/calendar, `briefLinks.ts`, localized demo titles
4. **Event detail UX** — Mac-style upward kind picker, breadcrumb from person
5. **Anniversary names** — Norwegian wedding day names from bryllupsdagen.no
6. **UX polish** — haptics, micro-animations, keyboard handling, kind picker overlay, relevance hints
7. **Project memory system** — Cursor rules + skill + sessionStart hook (`.cursor/rules/session-handoff.mdc`)

---

*remindifier — always lowercase.*
