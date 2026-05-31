# remindifier-rn — Current AI Session State

*Last updated: 2026-05-31 (session handoff — Expo Go dark screen / startup hardening)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `a10e9be` — `fix(startup): Expo Go dark screen — SafeAreaProvider, startup logging, layout fallbacks`
- **Previous:** `74fa98a` — `docs: sync session state commit hash` · `8e88788` — haptics + non-blocking calendar seed
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
- Type / paste / **iOS keyboard dictation** (no custom STT)
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
a10e9be fix(startup): Expo Go dark screen — SafeAreaProvider, startup logging, layout fallbacks
74fa98a docs: sync session state commit hash
8e88788 fix(startup): Expo Go white screen — haptics version, non-blocking calendar seed
df3248c chore: session handoff 2026-05-31 — code review + brief redesign
198b7a8 docs: session handoff — semantic intake MVP and typography tokens
7d03c8c refactor(styles): replace arbitrary font-size classes with named Tailwind tokens
```

---

## Open GitHub Issues / next work

| # | Title | Status |
|---|---|---|
| 38 | Voice input | **MVP done** — heuristic intake + iOS dictation; full AI transcription still future |
| 50 | Tonight mode | Not started |
| 52 | Apple Reminders deep link | Not started |
| 58 | Event prep | Mostly done (gather tab) |
| — | Brief blikkfang | Parked |
| — | Inbox UI (view/process inbox items) | Not started |
| — | Tab bar blur | Dev client only; Expo Go uses solid fallback |
| — | **Expo Go startup** | User still testing after dark-screen fix — check log for `migrations_ready` → `bootstrap_ready` → `tabs_render` |

**Next candidates:** #50 Tonight mode, inbox list UI, #53/#54 polish

---

## User Preferences (recurring)

- Session memory → `claude-current-remindifier-state.md` only
- Pull before / push after each agent task
- NativeWind **named tokens**, not arbitrary `text-[Xpx]`
- Icons over text; no guilt language; `logger` not `console.log`

---

## What Was Done (this session — 2026-05-31)

### Expo Go startup (white → dark screen follow-up)

**Symptom:** After haptics/calendar fix, app loaded but showed **dark screen with no content** (only `#1A1E26`).

**Diagnosis:** `app_launched` logged but no `bootstrap_ready` / `migrations_ready`. Likely causes: `ClerkLoaded` rendering null during load, ThemeProvider blocking children, bootstrap step hang, or NativeWind layout collapse (`flex-1` not applied).

**Fixes applied (uncommitted until this handoff):**

1. **`app/_layout.tsx`** — `SafeAreaProvider`; replaced `ClerkLoaded` with explicit `useAuth().isLoaded` + `LoadingScreen`; font error logging; splash hides on font error too
2. **`ThemeProvider`** — no longer blocks on SecureStore; default slate theme immediately; `style.backgroundColor` fallback alongside `className`
3. **`useBootstrapApp`** — per-step try/catch + logging (`bootstrap_seed_local_done`, `bootstrap_ready`); always proceeds on partial failure
4. **`app/(tabs)/_layout.tsx`** — startup logging (`migrations_ready`, `tabs_bootstrap_ready`, `tabs_render`); 15s migration timeout → `FatalScreen`; **BlurView → View in Expo Go** (`Constants.appOwnership === "expo"`)
5. **`AppShell` + `onboarding.tsx`** — `style={{ flex: 1, backgroundColor }}` fallbacks so layout works if NativeWind classes drop

### Prior commits (same day)

- **`8e88788`** — `expo-haptics ~15.0.8`; non-blocking `seedDevCalendar()`; ThemeProvider LoadingScreen; stack bg `#1A1E26`
- **`6472256` / `7d03c8c`** — semantic intake MVP; typography tokens
- **`337dc2e` / brief redesign** — code review + brief UX

**Noted for later:** OpenAI API key client-side → backend proxy; verify Expo Go shows brief after reload; `src/lib/haptics.ts` still has `console.log` debug lines → should use `logger`

---

*remindifier — always lowercase.*
