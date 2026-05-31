# remindifier-rn — Current AI Session State

*Last updated: 2026-05-31 — auto-loaded via Cursor rules + `.cursor/hooks/session-start.js`*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox`
- **Latest commit:** `66cc13d` — `docs: session handoff — GitHub issue review and next candidates`
- **CI:** lint + typecheck + test:coverage (expected green)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`**
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes

None — clean after this session's push.

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
| Blur | `expo-blur` installed (~15.0.8) — **requires new dev client build to activate** |
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
| ☀️ Brief | `(tabs)/brief.tsx` | Morning brief with sections |
| 🌿 Events | `(tabs)/gather/` | Gatherings + talking points |
| 👤 People | `(tabs)/people/` | Person library |
| 🪪 Myself | `(tabs)/myself.tsx` | Profile + QR |

Other: `sign-in`, `onboarding`, `settings`, `me-scan`, `sso-callback`

### Brief — current layout (top → bottom)

1. **Weather topline** (centered, tappable → BottomSheet): `⛅ 12° 🌧️ 0mm 💨 3km/h ›`
2. **Date nav**: `← 25. mai – 31. mai · Uke 22 →`
3. **Greeting** (`text-5xl leading-tight`, pt-6 pb-8): `God kveld, Henning.` (name in accent)
4. **Pill cards** (flex-row): I DAG · KVELDEN → each opens BottomSheet (`large`)
5. **Sections** (sectionOrder): Dagens program · Uken min · Heads-up · Merkedager · Trening
   - Weather section returns `null` (moved to topline)

### Brief — body formatting

Body strings use `"\n"` as sentence separator (all cases including `isEmpty`).
Renderer splits on `"\n"` with `.filter(Boolean)` — never split on `". "` (breaks "kl. 09:00").

### Brief — NativeWind rules

- Use **preset classes** (`text-5xl`, `pt-6`, `pb-8`) — always work
- Avoid **arbitrary bracket classes** (`text-[48px]`) — silently dropped if not safelisted
- Use **inline `style={{}}`** only when value genuinely absent from Tailwind scale

### Tab bar

Custom `FloatingTabBar` (floating pill, absolute bottom 20, borderRadius 30).
`expo-blur` `BlurView` installed but **inactive until dev client rebuild**.
Current fallback: `rgba(34,40,56,0.15)` overlay on BlurView → looks solid until rebuild.

### Events (gatherings)

- Natural language create → `eventParser.ts` (GPT-4o-mini)
- Kinds: **Spør, Tema, Small-talk, Heads-up**
- Mac-style kind picker pops upward from +
- Delete from list with confirm BottomSheet; haptic on delete
- `returnTo` param: create person mid-event → returns to event

### People

- Natural language intake → `naturalLanguageParser.api.ts`
- Merkedager with Norwegian wedding names
- Relevance hints in people list
- Breadcrumb «← Tilbake til event» when opened from gathering

### Icon conventions

- **Back:** ← chevron (20px, hitSlop 12) — not text
- **Edit:** amber ✎ (20px, top-right row)
- **Delete:** red 🗑 (20px); confirm sheet on gather list + people detail
- **Add person:** green 👤 circle button (no text)

---

## Recent commits (newest first)

```
fefd756 docs: sync brief layout and NativeWind rules in PROJECT_MEMORY
85a3aee chore: session handoff 2026-05-31 — brief weather topline + greeting anchor
8ecfc43 fix(brief): use NativeWind preset classes for greeting size and spacing
a7a04e2 fix(brief): inline style padding around greeting to bypass NativeWind purge
633c416 fix(brief): more breathing room around greeting (pt-6 pb-7)
257b7b3 fix(brief): increase greeting to 48px to restore visual weight on single line
ff97611 feat(brief): compact weather topline + single-line greeting + weather bottom sheet
```

---

## Test Coverage

- **20 test suites, ~183 tests** — all passing (last known run)
- Thresholds enforced in CI via `npm run test:coverage`

---

## Open GitHub Issues / next work

| # | Title | GitHub | Implementation |
|---|---|---|---|
| 38 | Voice input — speak naturally, AI transcribes + structures | OPEN | **MVP:** `/intake` heuristic parser + preview (no custom STT) |
| 16 | Share conversation (text/screenshot/voice) → AI extract | OPEN | Not started (share sheet) |
| 50 | Tonight mode — day-of view before meeting | OPEN | Not started — pairs with #58 event prep |
| 52 | Apple Reminders + deep link to event prep | OPEN | Not started (iOS EventKit) |
| 53 | Me profile + QR | **CLOSED** | Mostly done (`myself.tsx`) |
| 54 | Settings privacy/export/delete | **CLOSED** | Mostly done (`settings.tsx`) |
| 58 | Social event prep + talking points | OPEN | Mostly done (gather tab) |
| 61 | Calendar in morning brief | **CLOSED** | Done |
| 64 | Samvittighet-as-a-Service design principle | OPEN | Guiding principle (not a feature) |
| — | Brief blikkfang / visual hero | — | **Parked — no kicker found yet** |
| — | Tab bar blur (expo-blur) | — | Parked — needs new dev client build |
| — | CloudKit sync | — | Not started |
| — | Training labels (Push/Pull/Legs) i18n | — | Not done |

**Next candidates to discuss:** #50 (Tonight mode), #38 (voice → events/people), #53/#54 polish

### Voice / transcription (#38 — phase 2)

- **Vision (web #26):** tale naturlig → AI transkriberer og strukturerer til notater/events/samtalepunkter
- **Today:** kun fritekst → `eventParser.ts` / `naturalLanguageParser.api.ts` (GPT-4o-mini)
- **Not implemented:** ingen expo-speech, Whisper, eller mikrofon-UI
- **Natural fit:** mikrofon på `gather/new` og person-inntak — same parser pipeline after transcription

---

## User Preferences (recurring)

- **Session memory** → `claude-current-remindifier-state.md` only (never ad-hoc files)
- **Pull before / push after** each agent task
- **NativeWind preset classes** — never arbitrary `text-[Xpx]`; inline style only as last resort
- **Discuss before** introducing non-generic/non-reusable solutions
- **Icons over text** — ← back, amber ✎ edit, red 🗑 delete, green 👤 add
- **Norwegian bryllupsdager** — traditional names
- **Monday–Sunday** week navigation on brief
- Use **`logger`**, not `console.log`

---

## What Was Done (this session — 2026-05-31)

### Brief screen (earlier today)

1. Weather topline + BottomSheet · greeting anchor (`text-5xl`) · body `"\n"` separator · expo-blur (pending dev build) · NativeWind preset rules
2. `PROJECT_MEMORY.md` synced with brief layout conventions (`fefd756`)

### This handoff continuation

3. **GitHub issue review** — fetched all open/closed issues via `gh`; summarized for Henning
4. **Issue mapping:** #50 = day-of tonight view; #58 event prep largely built; #53/#54 CLOSED on GitHub but may need polish; #52 = Apple Reminders deep link (not started)
5. **No code changes** this continuation — docs/handoff only

### Voice / transcription gap (this continuation)

6. **Henning asked** about voice input for events — was missing from state file
7. **Mapped #38** (RN) ← web `remindifier` #26: AI transcription + parsing, phase 2, high complexity
8. **Mapped #16** — share conversation (incl. voice) → extract notes (separate flow)
9. **No code** — documentation gap closed in this handoff

### Parked

- Brief **blikkfang** — no kicker found yet
- **Voice input (#38)** — planned phase 2, not started

---

*remindifier — always lowercase.*
