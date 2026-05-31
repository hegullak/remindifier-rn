# remindifier-rn — Current AI Session State

*Last updated: 2026-05-31 (session handoff — Expo Go confirmed working, voice intake clarified)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `6f96b0e` — `docs: sync session state commit hash` (code fix: `0c40ed1` SecureStore DB key)
- **Previous:** `1b95335` / `a10e9be` — dark screen startup hardening
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
| Testing | Jest (~250 tests, 23 suites) |

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
- Confirm: creates gathering (+ talking points) or follow-up entry; inbox in AsyncStorage
- Files: `src/lib/intake/*`, `src/features/intake/SemanticIntakePreviewCard.tsx`, `intakeInboxRepo.ts`

### Brief layout

Weather topline → date nav → greeting (`text-5xl`) → pill cards → draggable sections. Body uses `"\n"` separator.

### Typography (NativeWind)

Custom tokens: `text-2xs`, `text-3xs`, `text-body`, `text-body-lg`, `text-nav`. Standard: `xs`, `sm`, `base`, `xl`, `3xl`, `5xl`. Avoid `text-[Npx]` except rare one-offs (28px greeting title).

---

## Recent commits (newest first)

```
6f96b0e docs: sync session state commit hash
0c40ed1 fix(db): SecureStore read/write use same keychain options
4dfc00d docs: session handoff — sync commit hash, Expo Go startup status
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
| — | ~~Expo Go startup~~ | **Resolved** (`0c40ed1`) — user confirmed app loads in Expo Go |

**Next candidates:** #38 in-app mic button / STT, #50 Tonight mode, inbox list UI, #53/#54 polish

---

## User Preferences (recurring)

- Session memory → `claude-current-remindifier-state.md` only
- Pull before / push after each agent task
- Session handoff **only when user asks** or session ends — not after every task
- NativeWind **named tokens**, not arbitrary `text-[Xpx]`
- Icons over text; no guilt language; `logger` not `console.log`

---

## What Was Done (this session — 2026-05-31)

### Expo Go startup — **confirmed working**

User confirmed **«Yes! Da er vi der»** after `0c40ed1` SecureStore fix. Full debug chain this session:

| Symptom | Fix commit |
|---|---|
| White screen | `8e88788` — expo-haptics SDK 54, non-blocking calendar seed |
| Dark screen | `a10e9be` — SafeAreaProvider, Clerk loading, bootstrap logging |
| Black screen | `e3f8f52` — React hooks order + visible FatalScreen |
| «Failed to persist database key» | `0c40ed1` — SecureStore get/set same `keychainService` options |

Also: `expo-router ~6.0.24`; startup log sequence documented.

### Voice / recording — user question (no code change)

User asked **«Hvor er recordingen?»** — clarified:

- **Entry:** header **+** → **«Si eller skriv»** → `app/intake.tsx`
- **Voice today:** iOS **keyboard dictation** (mic on keyboard), not in-app record button
- **Not built:** hold-to-record, audio files, custom STT (`expo-av` not in project)
- Hint in UI: `intake.dictationHint`

**Noted for later:** OpenAI API key → backend proxy; `haptics.ts` console.log → logger; optional #38 mic button in intake

---

*remindifier — always lowercase.*
