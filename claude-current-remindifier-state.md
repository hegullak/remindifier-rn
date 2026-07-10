# remindifier-rn — Current AI Session State

*Last updated: 2026-07-10 (session handoff — EAS dev build, calendars, look-forward)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox` (synced with `origin/sandbox`)
- **Latest commit:** `309551f` — `feat: EAS dev build, readonly calendars, look-forward, and Clerk client trust`
- **CI:** lint + typecheck + test:coverage (expected green)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`** (only push when user asks)
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes

None after this handoff commit.

---

## Vision (short)

**Samvittighet-as-a-Service** — opened every morning. Contextual memory + heads-up for people who matter. Not a CRM, not social, not guilt.

- **Event-driven**, not form-driven — profiles grow through events
- **Opportunity**, not failure — never shame for lost contact
- **Local-first, privacy-first** — SQLCipher on device; Clerk auth only; no analytics SDKs
- **Product name (UI):** **echoflow** (lowercase) — repo/package still `remindifier-rn`

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
| Themes | `sand` \| `slate` \| `guitar` (toggle via HG profile menu) |
| AI (user-initiated) | GPT-4o-mini via Cloudflare Worker (`EXPO_PUBLIC_PARSE_API_URL`); intake MVP = heuristics offline |
| Native dev | **expo-dev-client** + EAS (`eas.json`) — required for iPhone calendar |
| Haptics | expo-haptics `~15.0.8` (SDK 54 — **not** v56) |
| Blur | `expo-blur` in dev client; **Expo Go uses solid View fallback** for tab bar |
| Testing | Jest + integration tests in `tests/integration/` |

**Dev server (daily):** `npm run start:dev` → open **echoflow** dev app on phone (not Expo Go) → scan QR  
**Legacy / logging:** `npm run start:lan:log`

---

## App Structure

### Tabs (4) + key routes

| Route | Purpose |
|---|---|
| ☀️ Brief | `(tabs)/brief.tsx` — greeting, Dagen min / I morgen / Uken min, look-forward |
| 🌿 Events | `(tabs)/gather/` — gatherings + talking points |
| 👤 People | `(tabs)/people/` |
| 🪪 Myself | `(tabs)/myself.tsx` |
| 🎙️ Intake | `app/intake.tsx` — semantic voice/text capture |
| ⚙️ Settings | `app/settings.tsx` — Clerk, calendar selection, privacy, export/delete |

---

## What Was Done (recent — through 309551f)

### EAS development build (iPhone)

- Added `expo-dev-client`, `eas.json`, EAS projectId in `app.json` (owner `go4gullaksen`)
- `.npmrc` with `legacy-peer-deps=true` (fixes EAS `npm ci` peer-dep failures)
- npm scripts: `start:dev`, `build:dev:ios`, `build:dev:android`, `build:dev:ios:sim`
- EAS secrets: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `PARSE_API_URL`, `ANTHROPIC_API_KEY`
- **Successful iOS build:** `50725d67-09d2-451f-8639-aeef0db31fc3` (June 2026) — install link may have expired (~2 weeks); rebuild with `npm run build:dev:ios` if needed
- Requires **paid Apple Developer** account for device signing

### Readonly device calendars

- `src/lib/brief/calendarEvents.ts` — fetches EVENT calendars after permission; returns `{ events, access }`
- `src/lib/brief/calendarAccess.ts` — detects Expo Go (`Constants.appOwnership === "expo"`), skips native fetch
- `src/lib/brief/calendarSelection.ts` + `listDeviceCalendars.ts` — filter by user-selected IDs
- `CalendarSelectionSection.tsx` in Settings — toggles per calendar
- `userRepo.getSelectedCalendarIds` / `setSelectedCalendarIds` — stored in `briefPreferences.selectedCalendarIds`; default = all
- `useBriefData.ts` passes selected IDs to `fetchCalendarBriefEvents`
- `CalendarAccessNotice.tsx` in Brief when denied or Expo Go
- Dev stubs (`devCalendarStubs.ts`) only when week fetch is empty in `__DEV__`
- **Expo Go cannot read iPhone calendar** — iOS 17+ needs native `NSCalendarsFullAccessUsageDescription` in host binary

### Dagens glede (look-forward)

- DB migration `0002_known_albert_cleary.sql`, `lookForwardRepo.ts`, `lookForward.ts`
- `LookForwardPrompt.tsx` + `LookForwardSavedRow.tsx` in brief (current week only, `weekOffset === 0`)
- User saves one short “what I'm looking forward to” line per day

### Clerk Client Trust (new device sign-in)

- `session.ts` handles `needs_client_trust` → `client_trust` step
- `SignInScreen.tsx` shows email-code flow (same UI as 2FA) with `confirmDevice` copy
- Test: `src/features/auth/clerk/__tests__/session.test.ts`

### Brief (earlier commits on sandbox)

- Weather removed from brief (`91b60ee`)
- Evening layout, echoflow brand, guitar theme fix (`539dd18`)
- `EchoflowMark` on splash + app icon (`62af20f`)
- `weekOffset` in `useBriefData` + `calendarWeek.ts` — **week picker UI hidden** for now; offset logic ready for later

---

## Daily iOS workflow (physical device)

```powershell
git pull --rebase origin sandbox
npm install --legacy-peer-deps
npm run start:dev
```

1. Open **echoflow** dev app (installed via EAS — **not** Expo Go)
2. Scan QR from Metro
3. Grant calendar permission when prompted
4. **Settings → Kalendere i Brief** — pick which calendars feed the brief

---

## Semantic intake (still valid)

- **+ menu → «Si eller skriv»** → `/intake`
- Type / paste / **iOS keyboard dictation** (no custom STT, **no in-app record button**)
- `parseSemanticIntake` → preview card → Confirm / Edit / Send to inbox
- **Datetime conflict:** two times in one utterance → user picks; Confirm blocked until chosen
- Files: `src/lib/intake/*`, `SemanticIntakePreviewCard.tsx`, `intakeInboxRepo.ts`

---

## Recent commits (newest first)

```
309551f feat: EAS dev build, readonly calendars, look-forward, and Clerk client trust
62af20f feat(brand): move EchoflowMark to splash and app icon
539dd18 feat(brief): evening layout, echoflow brand, and guitar theme fix
91b60ee feat(brief): remove weather; expand tests and CI on sandbox
4f8792e fix(theme): darker cards in light mode — recessed warm panel, not stark white
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
| — | Week picker UI in Brief | Logic in place; UI hidden |
| — | New iOS dev build | Rebuild if EAS install link expired |

**Next candidates:** test calendar + look-forward on physical iPhone; #38 in-app mic; #50 Tonight mode; inbox list UI; expose week navigation in Brief

---

## User Preferences (recurring)

- Session memory → `claude-current-remindifier-state.md` only (when user asks for handoff)
- Pull before tasks; commit when asked; push only when user asks
- NativeWind **named tokens**; icons over text; `logger` not `console.log`
- Minimal diffs; match existing patterns

---

## Known issues / pitfalls

| Problem | Notes |
|---|---|
| No calendar in Expo Go | Expected — use EAS dev build |
| `needs_client_trust` on new device | Handled in SignInScreen; user confirms via email code |
| EAS build `npm ci` fails | `.npmrc` legacy-peer-deps |
| Install link expired | `npm run build:dev:ios` |
| `ClerkLoaded` blank screen | Use `useAuth().isLoaded` + `LoadingScreen` |
| Bootstrap hang on calendar | Never `await seedDevCalendar()` in bootstrap |

---

## File map (calendar + look-forward + EAS)

```
eas.json                          EAS build profiles
.npmrc                            legacy-peer-deps for EAS + local
app.json                          expo-dev-client plugin, EAS projectId
src/lib/brief/calendarEvents.ts   readonly fetch + access status
src/lib/brief/calendarAccess.ts   Expo Go detection
src/lib/brief/calendarSelection.ts
src/lib/brief/listDeviceCalendars.ts
src/features/settings/CalendarSelectionSection.tsx
src/features/brief/CalendarAccessNotice.tsx
src/db/repos/lookForwardRepo.ts
src/features/brief/LookForwardPrompt.tsx
src/features/brief/LookForwardSavedRow.tsx
src/features/auth/clerk/session.ts
docs/CLERK_NATIVE.md
```

---

*echoflow / remindifier — product name lowercase in UI.*
