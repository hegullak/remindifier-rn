# remindifier-rn — Current AI Session State

*Last updated: 2026-05-29 (session handoff — intake parser + dictation text visibility)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `39a6f31` — `fix(intake): multi follow-up parser and visible dictation text`
- **Previous:** `5e56498` / `42935b6` — Expo Go working, voice intake clarified
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
| Testing | Jest (~254 tests, semantic intake suite expanded) |

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
- `parseSemanticIntake` → preview card (event, time, person, **bullet follow-ups**) → **Confirm** / **Edit** / **Send to inbox**
- Confirm: creates gathering (+ talking points from follow-ups) or follow-up entry; inbox in AsyncStorage
- Files: `src/lib/intake/*`, `src/features/intake/SemanticIntakePreviewCard.tsx`, `intakeInboxRepo.ts`

### Brief layout

Weather topline → date nav → greeting (`text-5xl`) → pill cards → draggable sections. Body uses `"\n"` separator.

### Typography (NativeWind)

Custom tokens: `text-2xs`, `text-3xs`, `text-body`, `text-body-lg`, `text-nav`. Standard: `xs`, `sm`, `base`, `xl`, `3xl`, `5xl`. Avoid `text-[Npx]` except rare one-offs (28px greeting title).

---

## Recent commits (newest first)

```
39a6f31 fix(intake): multi follow-up parser and visible dictation text
5e56498 docs: sync session state commit hash
42935b6 docs: session handoff — Expo Go working, voice intake clarified
0c40ed1 fix(db): SecureStore read/write use same keychain options
e3f8f52 fix(startup): React hooks order + visible FatalScreen for Expo Go
a10e9be fix(startup): Expo Go dark screen — SafeAreaProvider, startup logging, layout fallbacks
```

---

## Open GitHub Issues / next work

| # | Title | Status |
|---|---|---|
| 38 | Voice input | **MVP done** — + menu → `/intake`, iOS keyboard dictation; **no in-app recorder** yet; STT/transcription = future |
| 50 | Tonight mode | Not started |
| 52 | Apple Reminders deep link | Not started |
| 58 | Event prep | Mostly done (gather tab) |
| — | Brief blikkfang | Parked |
| — | Inbox UI (view/process inbox items) | Not started |
| — | Tab bar blur | Dev client only; Expo Go uses solid fallback |
| — | ~~Expo Go startup~~ | **Resolved** — user confirmed app loads in Expo Go |
| — | Intake parser edge cases | **Improved** — multi follow-ups; still heuristic (e.g. conflicting weekdays Jonas onsdag/torsdag not resolved) |

**Next candidates:** #38 in-app mic button / STT, #50 Tonight mode, inbox list UI, intake datetime conflict handling

---

## User Preferences (recurring)

- Session memory → `claude-current-remindifier-state.md` only
- Pull before / push after each agent task
- Session handoff **only when user asks** or session ends — not after every task
- NativeWind **named tokens**, not arbitrary `text-[Xpx]`
- Icons over text; no guilt language; `logger` not `console.log`

---

## What Was Done (this session — 2026-05-29)

### Semantic intake — user feedback + fixes

User tested natural-language prompts (Norwegian) and reported:

1. **Text invisible during dictation** on intake screen
2. **Single follow-up blob** instead of multiple bullets
3. **Missed follow-ups** («flytte i vår», bryllup/gratulere, etc.)
4. **Whole paragraph in event title** on some parses

**Fixes shipped:**

| Area | Change |
|---|---|
| `app/intake.tsx` | `TextInput` uses explicit `StyleSheet` + `useAppTheme` colors (not NativeWind `className` on input) |
| `semanticIntakeParser.ts` | Strip follow-ups inline (don't drop whole clause); multiple bullets via `splitFollowUpPhrase`; patterns for `nevnte noe om`, `nevnte at`, `vil også ta opp at`; prefer specific event keyword (`lunsj`) over generic `møte`; shorter titles (`MAX_EVENT_TITLE_LEN` 55); `og` lowercase in names |
| `SemanticIntakePreviewCard.tsx` | Follow-ups as bullet list in preview; multiline edit (one per line); theme-aware input colors |
| `applySemanticIntakeEdits` | Split `followUpText` on newlines → multiple follow-ups |
| i18n | `intake.followUpPlaceholder` (EN/NO) |
| Tests | User's three Norwegian examples + edit split test (11 tests in suite) |

**Verified:** `npm test -- semanticIntakeParser`, `npm run typecheck` green.

**Known limits (not fixed):** conflicting datetimes in one sentence (Jonas onsdag vs torsdag); hyttetur discussion not auto-extracted as follow-up unless phrased as reminder.

### Prior session context (still valid)

Expo Go startup resolved (`0c40ed1` SecureStore). Voice = iOS keyboard dictation via **+ → Si eller skriv** — no in-app recorder.

---

*remindifier — always lowercase.*
