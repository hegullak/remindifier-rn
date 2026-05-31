# remindifier-rn — Current AI Session State

*Last updated: 2026-05-31 (session handoff — Expo Go white screen fix)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `17cd054` — `fix(startup): Expo Go white screen — haptics version, non-blocking calendar seed`
- **Previous:** `df3248c` — `chore: session handoff 2026-05-31 — code review + brief redesign`
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
| Blur | `expo-blur` — needs dev client rebuild |
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
17cd054 fix(startup): Expo Go white screen — haptics version, non-blocking calendar seed
df3248c chore: session handoff 2026-05-31 — code review + brief redesign
198b7a8 docs: session handoff — semantic intake MVP and typography tokens
7d03c8c refactor(styles): replace arbitrary font-size classes with named Tailwind tokens
6472256 feat(intake): semantic voice/text capture with preview before save
337dc2e refactor: code review fixes — security, correctness, performance, duplication
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
| — | Tab bar blur | Needs dev client rebuild |

**Next candidates:** #50 Tonight mode, inbox list UI, #53/#54 polish

---

## User Preferences (recurring)

- Session memory → `claude-current-remindifier-state.md` only
- Pull before / push after each agent task
- NativeWind **named tokens**, not arbitrary `text-[Xpx]`
- Icons over text; no guilt language; `logger` not `console.log`

---

## What Was Done (this session — 2026-05-31)

### Expo Go white screen fix

User reported **white screen** in Expo Go. Log analysis:

- Metro bundled OK (~2051 modules); `app_launched` logged; **no JS errors**
- Latest failing runs: `app_launched` but **no** `seed_calendar_refreshed` (bootstrap hung)
- Expo warned: `expo-haptics@56.0.3` installed but SDK 54 expects `~15.0.8`

**Fixes applied:**

1. **`expo-haptics` → `~15.0.8`** — wrong SDK 56 package removed
2. **`useBootstrapApp`** — `seedDevCalendar()` no longer blocks UI (runs in background); calendar permission dialog could hang bootstrap indefinitely in Expo Go
3. **`ThemeProvider`** — shows `LoadingScreen` while theme loads from SecureStore (was empty `View` → white flash)
4. **`app/_layout.tsx`** — root stack `contentStyle.backgroundColor` set to `#1A1E26` (CSS `var(--bg)` invalid in RN StyleSheet)

**Files:** `package.json`, `package-lock.json`, `src/bootstrap/useBootstrapApp.ts`, `src/theme/ThemeProvider.tsx`, `app/_layout.tsx`

### Prior session (same day, already committed)

1. **Semantic intake MVP** (`6472256`) — `/intake`, heuristic parser, preview card, confirm/edit/inbox
2. **Typography refactor** (`7d03c8c`) — custom tokens; 295 replacements across 33 files
3. **Brief redesign** — weather topline, greeting `text-5xl`, body `"\n"` separator
4. **Code review** (`337dc2e`) — SQLCipher guard, QR limits, N+1 batching, briefHelpers extraction

**Noted for later:** OpenAI API key client-side → needs backend proxy; tab bar blur needs dev client rebuild

---

*remindifier — always lowercase.*
