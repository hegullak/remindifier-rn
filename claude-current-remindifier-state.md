# remindifier-rn — Current AI Session State

*Last updated: 2026-05-30 — auto-loaded via Cursor rules + `.cursor/hooks/session-start.js`*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `2a2c9ee` — `feat(ux): consistent icon system + confirm delete + input alignment`
- **CI:** lint + typecheck + test:coverage (expected green)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`**
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes

None (clean after this handoff commit).

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
| Haptics | expo-haptics |
| Logging | react-native-logs + expo-file-system (local only) |
| Testing | Jest (~183 tests, 20 suites) |
| Lint/format | Biome 2.4.16 |

**Expo docs:** https://docs.expo.dev/versions/v56.0.0/

**Dev server:** `npm run start:lan:log` (→ `expo-output.log`) · dev client: `npx expo start --dev-client --lan --clear`

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

- Schedule/calendar rows **clickable** → event or `/gather/new?prefill=…` via `briefLinks.ts`
- Demo schedule `s1` localized → «Middag hos Ida» (NO)

### Events (gatherings)

- Natural language create → `eventParser.ts` (GPT-4o-mini)
- Kinds: **Spør, Tema, Small-talk, Heads-up**
- Mac-style kind picker pops **upward** from +; select kind → input appears with autoFocus
- Delete from list (trash) with confirm BottomSheet; haptic on delete
- `returnTo` param: create person mid-event → returns to event, not person card
- Demo `g-1` title localized via `localizeGathering.ts`

### People

- Natural language intake → `naturalLanguageParser.api.ts`
- Merkedager with Norwegian wedding names
- Relevance hints in people list
- Breadcrumb «← Tilbake til event» when opened from gathering

### Icon conventions (current)

- **Back:** ← chevron (20px, hitSlop 12) — not text
- **Edit:** amber ✎ (20px, top-right row)
- **Delete:** red 🗑 (20px); confirm sheet on gather list + people detail
- **Add person:** green 👤 circle button (no text)

---

## Recent commits (newest first)

```
2a2c9ee feat(ux): consistent icon system + confirm delete + input alignment
8841e0e fix(ux): keyboard white background debug - transparent input container
7aa0d4e feat(ux): major flow improvements - delete from list + input flow + navigation icons + event flow fix
a609fd9 chore: project memory system — rules, skill, and sessionStart hook
4634ecc feat: brief-to-event navigation, Mac-style kind picker, and localized titles
65fd42c feat: events tab with AI prep, talking points, and wedding anniversary names (#58, #50)
34e0833 feat: connect remindifier calendar to morning brief (#61)
```

---

## Test Coverage

- **20 test suites, ~183 tests** — all passing (last known run)
- Thresholds enforced in CI via `npm run test:coverage`

---

## Open GitHub Issues / next work

| # | Title | Status |
|---|---|---|
| 61 | Calendar in morning brief | ✅ Done |
| 58 | Events tab + AI prep | ✅ Mostly done |
| 50 | Tonight mode — expanded card before meeting | Not started |
| 52 | Apple Reminders + deep link to event prep | Not started |
| 53 | Me profile + QR | Partially done |
| 54 | Settings privacy/export/delete | Partially done |
| — | CloudKit sync | Not started |
| — | `start:dev:log` npm script (dev client + log file) | Not done |
| — | Training labels (Push/Pull/Legs) i18n | Not done |

---

## User Preferences (recurring)

- **Session memory** → `claude-current-remindifier-state.md` only (never ad-hoc files)
- **Pull before / push after** each agent task
- **Icons over text** — ← back, amber ✎ edit, red 🗑 delete, green 👤 add
- **Norwegian bryllupsdager** — traditional names
- **Monday–Sunday** week navigation on brief
- Use **`logger`**, not `console.log`

---

## What Was Done (this session)

1. **Brief ↔ events UX** (4634ecc) — clickable brief rows, Mac kind picker, localized demo titles, breadcrumb back from person
2. **Project memory system** (a609fd9) — `session-handoff.mdc`, `project-memory` skill, `session-start.js` hook; `session-stop.js` auto-handoff on dirty git
3. **Event/people flow fixes** (7aa0d4e) — delete from gather list; kind picker → input flow; `returnTo` through people/new so mid-event person create returns to event
4. **Icon system** (2a2c9ee) — consistent ✎/🗑/← across screens; confirm delete on gather list; + row right-aligned on event detail
5. **Keyboard debug** (8841e0e) — transparent input container for white background issue
6. **Docs/process** — corrected session file vs Gemini prompt; documented `npm run start:lan:log` for agent log access

---

*remindifier — always lowercase.*
