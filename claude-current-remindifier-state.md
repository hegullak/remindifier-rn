# remindifier-rn — Current AI Session State

*Last updated: 2026-05-31 — auto-loaded via Cursor rules + `.cursor/hooks/session-start.js`*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `198b7a8` — `docs: session handoff — semantic intake MVP and typography tokens`
- **CI:** lint + typecheck + test:coverage (expected green)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`**
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes

None after this handoff commit (intake token alignment included).

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
| Haptics | expo-haptics |
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
7d03c8c refactor(styles): replace arbitrary font-size classes with named Tailwind tokens
6472256 feat(intake): semantic voice/text capture with preview before save
337dc2e refactor: code review fixes — security, correctness, performance, duplication
42fbf1e docs: session handoff — voice input #38 and transcription roadmap
6bb8e2c docs: session handoff 2026-05-31 — brief status and next candidates
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

1. **Semantic intake MVP** (`6472256`) — `/intake`, heuristic parser, preview card, confirm/edit/inbox, + menu entry, 7 tests
2. **Typography refactor** (`7d03c8c`) — custom tokens in `tailwind.config.js`; 295 replacements across 33 files
3. **Intake token alignment** — intake screen + AppShell use `text-xl`, `text-body-lg`, `text-3xs`, etc.
4. **Docs** — issue #38 mapped; `git pull --rebase` (already up to date)

### Claude Code session (same day)

5. **Brief redesign** — weather topline (centered, tappable→sheet), greeting `text-5xl` pt-6 pb-8, body `"\n"` separator
6. **Code review** (`337dc2e`) — security + best practices + architecture:
   - SQLCipher key guard (throws on empty key)
   - QR payload: 4096-byte limit + field truncation
   - N+1 → 4 batched queries in `listPeopleSummaries`
   - `setTimeout` mountedRef guard in gather/[id] + people/[id]
   - `briefHelpers.ts` — extracted `formatTime`, `isWorkEvent`, `buildWeekendSummary`
   - `briefGreetingLine` → `{ lead, name }` structured return
   - `BriefWeatherDetail.kind` — type-safe lookup
   - Removed `@anthropic-ai/sdk` (unused)
7. **Tailwind typescale** (`7d03c8c`) — 5 custom tokens, 295 replacements across 33 files

**Noted for later (not yet done):** OpenAI API key client-side → needs backend proxy

---

*remindifier — always lowercase.*
