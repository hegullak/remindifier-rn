# remindifier-rn — Current AI Session State

*Last updated: 2026-06-01 (session handoff — events + people redesign)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `5bcc6d0` — `feat(people): edit form polish — date pickers, icon kind picker, cleanup`
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
ee70547 docs: sync session state commit hash
286b384 feat(intake): datetime conflict picker when two times mentioned
c5b3f62 docs: sync session state commit hash
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
- Session handoff **only when user explicitly asks** (e.g. "SESSION HANDOFF") — never after ordinary tasks or because git is dirty
- NativeWind **named tokens**; icons over text; `logger` not `console.log`

---

## What Was Done (this session — 2026-06-01, Claude Code)

Big UX pass on **brief, events, and people**. All committed + pushed to `sandbox` (latest `5bcc6d0`).

### Brief
- Weather moved to AppShell header (top-left, same row as +/HG), tappable → weather BottomSheet
- Greeting is the visual anchor (`text-5xl`); time-contextual **ambient headline** under it (morning 06–09 / evening 20:30+) with detail lines (first meeting, lunch, weekend). **NOTE: time windows TEMP-widened for testing in brief.tsx — `h>=6&&h<15`=morning, `h>=15`=evening. Revert to real windows (`6–9` / `20:30+`) before release.**
- Simplified to **two sections**: "Dagen min" (today: schedule + today's calendar/red-letter + training) and "Uken min" (tomorrow+, collapsible accordion showing "+N", tap card to expand)
- Contextual event icons via `src/lib/brief/eventIcon.ts` (☕🥗🍽️🦷🩺⚽🏋️🏃✈️🎉, clock fallback)
- Seed: added today private events (Kaffe med Marte, Tannlege) in `seedCalendar.ts`

### Events (gather)
- Detail redesign: flat talking-point rows with kind emoji, tap=toggle done, **swipe→✎edit (inline)+🗑delete**
- Inline composer: + reveals input below last point, icon-only kind picker (2 kinds: ?/💬), ✓ adds, scrollToEnd, keyboardShouldPersistTaps
- List: swipe→✎/🗑, rounded corners via `borderRadius+overflow:hidden` wrapper

### People
- List: swipe→✎edit/🗑delete (Card-outer structure for rounded corners), reloads on focus (usePeopleData exposes `reload`)
- Detail simplified to 3 roles: **Kjekt å vite** (facts) · **Events** · **Oppfølging** (follow-ups only; timeline note/follow_up toggle removed). Monogram avatar (initials, per-person color). Swipe edit/delete on follow-ups.
- Header: ⋯ menu → moved to AppShell **+ menu** (Edit/Delete); back arrow always → returnTo or /people
- Edit form: relationType = **preset category chips** (label now "Hvordan vi kjenner hverandre"); birthday+merkedager unified into one section; merkedag uses **DateTimePicker** + icon kind picker; removed "Årstall er kjent" + "Håndter med varsomhet"; "Kjekt å vite" = inline fact list (not textarea)
- Merkedager elapsed time now shows **combined "X år Y måneder"** (`red-letter-days.ts`)

### Global fixes
- **BottomSheet now re-applies `dark` class** from `useAppTheme` (Modal renders outside ThemeProvider tree → fixed all modal text-color bugs at the root). Removed per-component color hacks.
- Tab bar: tapping already-focused tab pops nested stack to root (people icon → always list)
- Tailwind named font-size tokens; removed unused `@anthropic-ai/sdk`
- Code review fixes (`337dc2e`): SQLCipher key guard, QR payload limits, N+1→batched in peopleRepo, setTimeout mountedRef guards, briefHelpers extraction, briefGreetingLine→{lead,name}, BriefWeatherDetail.kind

### NEXT (requested, not yet done)
1. **relationType multi-select** — currently single string. User wants to pick multiple ("Min far og nære venn"). Needs: store multiple (comma-join canonical values), update `translateRelationType` to split+join with "og"/"and", multi-select chips in PersonForm, display in list/detail. Decide on "Min" possessive prefix (user was asked, no answer yet).

### Noted for later
- **Revert TEMP ambient time windows** in `app/(tabs)/brief.tsx` before release
- OpenAI API key client-side → backend proxy (Cloudflare Worker in progress per earlier prompt)
- expo-blur tab bar inactive until dev client rebuild

---

## Earlier this session (Cursor — intake datetime conflict)

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
