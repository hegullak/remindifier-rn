# remindifier-rn — Current AI Session State

*Last updated: 2026-05-31 (session handoff — intake datetime conflict picker)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `334d73f` — `feat(intake): datetime conflict picker when two times mentioned`
- **Previous:** `c5b3f62` / `3d50bbc` — multi follow-ups + dictation text fix
- **CI:** lint + typecheck + test:coverage (expected green)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`**
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes

None after this handoff commit.

---

## Vision (short)

**Samvittighet-as-a-Service** — opened every morning. Contextual memory + heads-up for people who matter. Not a CRM, not social, not guilt.

- **Event-driven**, not form-driven — profiles grow through events
- **Opportunity**, not failure — never shame for lost contact
- **Local-first, privacy-first** — SQLCipher on device; Clerk auth only; no analytics SDKs
- Always write **remindifier** lowercase

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 / React 19 |
| Navigation | expo-router (tabs + stacks) |
| Auth | `@clerk/clerk-expo` |
| Database | `expo-sqlite` + SQLCipher + AsyncStorage (intake inbox) |
| ORM | Drizzle |
| Styling | NativeWind v4 — named typography tokens + presets |
| AI (user-initiated) | GPT-4o-mini (person/event parsers); intake MVP = heuristics only |
| Haptics | expo-haptics `~15.0.8` (SDK 54 — **not** v56) |
| Blur | `expo-blur` in dev client; **Expo Go uses solid View fallback** for tab bar |
| Testing | Jest (~256 tests, semantic intake suite) |

**Dev server:** `npm run start:lan:log` · dev client: `npx expo start --dev-client --lan --clear`

---

## App Structure

### Tabs (4) + key routes

| Route | Purpose |
|---|---|
| ☀️ Brief | `(tabs)/brief.tsx` — weather topline, greeting, pills, sections |
| 🌿 Events | `(tabs)/gather/` — gatherings + talking points |
| 👤 People | `(tabs)/people/` |
| 🪪 Myself | `(tabs)/myself.tsx` |
| 🎙️ Intake | `app/intake.tsx` — semantic voice/text capture |

Other: `sign-in`, `onboarding`, `settings`, `me-scan`

### Semantic intake (MVP — #38 partial)

- **+ menu → «Si eller skriv»** → `/intake`
- Type / paste / **iOS keyboard dictation** (no custom STT, **no in-app record button**)
- `parseSemanticIntake` → preview card → **Confirm** / **Edit** / **Send to inbox**
- **Multiple follow-ups** as bullet list; edit = one per line
- **Datetime conflict:** two times in one utterance → user picks (e.g. onsdag 12 vs torsdag 13); Confirm blocked until chosen
- Confirm: creates gathering (+ talking points) or follow-up entry; inbox in AsyncStorage
- Files: `src/lib/intake/*`, `src/features/intake/SemanticIntakePreviewCard.tsx`, `intakeInboxRepo.ts`

---

## Recent commits (newest first)

```
334d73f feat(intake): datetime conflict picker when two times mentioned
c5b3f62 docs: sync session state commit hash
3d50bbc fix(intake): multi follow-up parser and visible dictation text
```

---

## Open GitHub Issues / next work

| # | Title | Status |
|---|---|---|
| 38 | Voice input | **MVP done** — keyboard dictation; no in-app recorder yet |
| 50 | Tonight mode | Not started |
| 52 | Apple Reminders deep link | Not started |
| 58 | Event prep | Mostly done (gather tab) |
| — | Inbox UI | Not started |
| — | ~~Expo Go startup~~ | **Resolved** |
| — | ~~Intake multi follow-ups~~ | **Done** (`3d50bbc`) |
| — | ~~Intake datetime conflict~~ | **Done** (this session) |

**Next candidates:** #38 in-app mic / STT, #50 Tonight mode, inbox list UI

---

## User Preferences (recurring)

- Session memory → `claude-current-remindifier-state.md` only
- Pull before / push after each agent task
- Session handoff **only when user asks** or session ends
- NativeWind **named tokens**; icons over text; `logger` not `console.log`

---

## What Was Done (this session — 2026-05-31)

### Intake — datetime conflict (user feedback)

User tested Marte/Jonas lunch text again: parser got most fields but **missed torsdag kl. 13** vs onsdag kl. 12. Wanted app to **ask which time** to save.

**Shipped:**

| Area | Change |
|---|---|
| `semanticIntakeParser.ts` | `extractAllDateTimes()` finds every weekday+clock in text; `resolveScheduledAt()` returns `scheduledAtOptions` + `datetime_conflict` when ≥2 distinct times; scan uses **full `rawText`**; clock regex supports `klokken`, avoids `to` false-match in «torsdag» |
| `semanticIntakeParser.types.ts` | `ScheduledAtOption`, `scheduledAtOptions?` on parse result |
| `SemanticIntakePreviewCard.tsx` | Tappable time choices when conflict; Confirm hint via ambiguity line |
| `app/intake.tsx` | Confirm disabled until user picks a time |
| i18n | `intake.datetimeConflictHint`, `intake.ambiguity.datetime_conflict` (EN/NO) |
| Tests | Complex lunch + conflict resolution + pick clears ambiguity (12 tests in suite) |

**Verified:** `npm test -- semanticIntakeParser`, `npm run typecheck` green.

### Prior session (still valid)

Multi follow-up parser, visible dictation text (`3d50bbc`), Expo Go startup fixed.

---

*remindifier — always lowercase.*
