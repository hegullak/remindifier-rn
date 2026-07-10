# remindifier-rn — Current AI Session State

*Last updated: 2026-07-10 (session — Brief/Day/Week nav, Daily Brief MVP, echoflow calendar sync)*

**This file is the session snapshot.** Architecture lives in [`PROJECT_MEMORY.md`](./PROJECT_MEMORY.md).  
Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`

> **User agreement:** Never save session context to ad-hoc files. Always update **this file** at session end.

---

## Repository

- **Repo:** `https://github.com/hegullak/remindifier-rn`
- **Active branch:** `sandbox` (synced with `origin/sandbox` as of session start; local commits below not yet pushed)
- **Latest local commit:** see "Recent commits" below
- **CI:** lint + typecheck + test:coverage (378/378 tests passing as of this session)

### Git workflow (user rule)

1. **Start every task:** `git pull --rebase origin sandbox`
2. **End every task:** stage, commit, **`git push origin sandbox`** (only push when user asks)
3. **Never commit:** `.env`, `coverage/`, `expo-output.log`, `node_modules/`

### Uncommitted local changes

None — all work this session is committed locally. **Not yet pushed** (push only when user asks).

### Native config change pending a rebuild

`app.json`'s `expo-calendar` `calendarPermission` string changed (now mentions writing to the app's own calendar). This is an `Info.plist` change — **requires a new EAS dev build** (`npm run build:dev:ios`) to take effect; a Metro-only reload is not enough.

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

### Tabs (3, mid-restructure) + key routes

**Product direction shift this session:** echoflow is being spun toward a **daily Brief/Day loop** (interpreted "how is my day" summary), away from People/Events/Myself as tabs. See `PROJECT_MEMORY.md` for the full direction brief if written up there; source of truth for now is this file + the code.

| Route | Purpose |
|---|---|
| ☀️ Brief | `(tabs)/brief.tsx` — **rewritten**: interpreted day (load verdict, rhythm, breathing room, important today/later, recommendation) from `interpretDay()`. Currently renders **mock data** with a dev-only scenario switcher (light/moderate/busy); not yet wired to real calendar events. Old person-first sections (merkedager, look-forward, PPL training, gathering links) removed from the screen but their lib/repo code is untouched. |
| 📅 Day | `(tabs)/day.tsx` — placeholder ("Day view coming soon"). Next: concrete timeline (morgen/lunsj/ettermiddag/kveld) per the Daily Brief plan below. |
| 📊 Week | `(tabs)/week.tsx` — placeholder, **slated for removal** (2-tab IA decided: Brief + Day only; Settings reached via profile menu, not a tab). Not yet removed — do this when Day is wired to real data. |
| 🎙️ Intake | `app/intake.tsx` — semantic voice/text capture; on confirm now redirects to `/(tabs)/brief` (was `/gather`, `/people/:id`, both removed) |
| ⚙️ Settings | `app/settings.tsx` — Clerk, calendar selection (read-only), **new: echoflow calendar sync**, privacy, export/delete |

**Removed this session:** `app/(tabs)/gather/` (events tab), `app/(tabs)/people/` (people tab), `app/(tabs)/myself.tsx`. DB tables/repos for gatherings/people are untouched (not deleted) — only the tab UI and navigation are gone. `RedLetterRow`, `briefGatheringHref` and other Brief-screen-only helpers were removed since they had no other callers.

---

## What Was Done (this session, newest first)

### Feature: writable "echoflow" device calendar + one-way calendar copy

**User's ask:** each user gets their own writable `echoflow` calendar on-device (iOS, via expo-calendar). Users can "copy" other whole calendars into it (not event-by-event) so the app can freely read/write/edit inside its own calendar without ever touching the user's other calendars.

**Decisions confirmed with user:** calendar is named **"echoflow"** (not "echonote" — that was leftover naming from an icon reference asset, not intentional); sync is **manual** (Kopier inn / Synkroniser på nytt buttons), not automatic background sync.

- `src/lib/brief/echoCalendar.ts` — `getOrCreateEchoCalendarId()`: finds-or-creates the `echoflow` calendar by title (always re-resolved live, never trusts a cached id). On iOS, prefers a `SourceType.LOCAL` source (falls back to `getDefaultCalendarAsync().source`) so the calendar stays **device-local, never iCloud-synced** — matches the app's local-first stance.
- `src/lib/brief/calendarSyncPlan.ts` — **pure**, fully tested diff engine: `buildEventSignature()` (cheap change-detection string, not a real hash) + `planCalendarSync()` (create/update/delete sets). No expo-calendar or DB calls — this is the testable core.
- `src/lib/brief/calendarSync.ts` — orchestrator: `syncLinkedCalendar(userId, sourceCalendarId, sourceCalendarTitle)` fetches source events in a **90-days-past / 365-days-future window** (expo-calendar has no true "get all events" call — this is the practical scope of "copy the whole calendar"), diffs against `calendar_sync_events`, applies create/update/delete against the echoflow calendar via `Calendar.createEventAsync`/`updateEventAsync`/`deleteEventAsync`. `unlinkCalendar()` removes all copied echo events + the link. Same sync function serves both first-copy and manual re-sync.
- **New DB tables** (migration `0003_clumsy_thundra`): `calendar_sync_links` (which source calendars are linked, `lastSyncedAt`), `calendar_sync_events` (per-event source→echo id + signature mapping, for cheap re-diff). **`src/db/drizzle/migrations.ts` was hand-edited** to match the generated `.sql` — this file is NOT auto-generated by `drizzle-kit generate`, must be kept in sync manually (see pattern from `m0000`–`m0002`).
- `src/db/repos/calendarSyncRepo.ts` — CRUD for the two new tables.
- `src/features/settings/EchoCalendarSection.tsx` — new Settings section below "Kalendere i Brief": lists device calendars (excluding echoflow itself), per-calendar "Kopier inn" → "Sist synkronisert" + "Synkroniser på nytt" / "Fjern".
- `app.json` — `expo-calendar` `calendarPermission` string updated (previously falsely claimed "Events are never modified"; **needs new EAS dev build to take effect**, see above).
- i18n: `settings.echoCalendar.*` added (NO+EN); `settings.calendar.readOnlyNote` corrected (was making an inaccurate "never creates/edits" promise).
- Tests: `calendarSyncPlan.test.ts` (9, pure), `calendarSync.test.ts` (7, mocked expo-calendar + repo) — all passing.
- **Not yet done:** actually running this on a physical device build (needs the new EAS rebuild first); no UI test of the Settings section in a live app.

### Daily Brief MVP — domain layer + interpreted Briefs screen

Product pivot per user direction: *"Kalenderen viser tid. echoflow forklarer dagen."* Briefs interprets the day (light/moderate/busy, rhythm, breathing room, important today/later, one soft recommendation) instead of just listing events.

- `src/lib/brief/analyzeDay.ts` — `analyzeDay()`: single shared `DaySignals` type (load split morning/afternoon/evening, gaps ≥45min, back-to-back detection, lunch-free check, outside-work-hours, special/non-work events). Consolidates logic previously duplicated in `morningBrief.ts`/`eveningWindDown.ts`'s private `analyseEvents`.
- `src/lib/brief/dayLoad.ts` — `classifyDayLoad()`: light/moderate/busy heuristic with explainable reasons (event count, total meeting minutes, back-to-back, outside work hours).
- `src/lib/brief/interpretDay.ts` — composes signals into the six Briefs sections, NO/EN, with a separate evening ("tomorrow-focused") variant.
- `src/lib/brief/mockDay.ts` — light/moderate/busy mock scenarios (Brief screen currently runs on these, not real calendar data yet).
- `CalendarBriefEvent` gained optional `endDate` (populated in `mapToCalendarBriefEvent`) for meeting-time/gap math.
- New cards: `DayLoadCard`, `BriefTextCard`, `ImportantItemsCard` (all under `src/features/brief/`).
- Added `red` to `BriefStripeColor` (busy-day verdict stripe).
- Tests: `analyzeDay.test.ts` (18), `dayLoad.test.ts` (7), `interpretDay.test.ts` (10) — pure, no mocking needed.
- **Next:** wire `interpretDay()` to real `useBriefData` calendar events (currently mock-only); build the Day tab timeline; remove the Week tab.

---

## What Was Done (earlier — through 309551f)

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

## Recent commits (newest first, local — see git log for exact hashes)

```
(uncommitted at time of writing this section — see `git log` after this session's final commit)
feat: writable echoflow calendar + one-way calendar copy sync
feat(brief): interpreted Briefs home screen from mock data
feat(brief): day analysis, load heuristic, and mock scenarios
i18n: add day/week tab labels, remove old tabs
refactor: simplify navigation to Brief, Day, Week tabs
309551f feat: EAS dev build, readonly calendars, look-forward, and Clerk client trust
62af20f feat(brand): move EchoflowMark to splash and app icon
```

---

## Open GitHub Issues / next work

| # | Title | Status |
|---|---|---|
| 38 | Voice input | **MVP done** — keyboard dictation; no in-app recorder yet |
| 50 | Tonight mode | Not started |
| 52 | Apple Reminders deep link | Not started |
| 58 | Event prep | Gather tab **removed** from nav this session — feature deprioritized, code still present |
| — | Daily Brief MVP | **In progress** — Briefs screen interprets mock data; Day tab is a placeholder; not wired to real calendar yet |
| — | echoflow calendar sync | **In progress** — sync engine + Settings UI built and tested; not yet exercised on a physical device (needs EAS rebuild for the updated `Info.plist` permission string) |
| — | Week tab removal | Pending — remove once Day tab has real content |
| — | New iOS dev build | **Required** — `app.json` native config changed (calendar permission string); old install is stale regardless |

**Next candidates:** rebuild EAS dev client and test echoflow calendar copy + Daily Brief on physical iPhone; wire `interpretDay()` to real `useBriefData` events; build Day tab timeline; remove Week tab; #38 in-app mic; #50 Tonight mode.

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
app.json                          expo-dev-client plugin, EAS projectId, calendar permission string
src/lib/brief/calendarEvents.ts   readonly fetch + access status (+endDate now)
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

## File map (echoflow calendar sync — new this session)

```
src/lib/brief/echoCalendar.ts           find-or-create the writable "echoflow" device calendar
src/lib/brief/calendarSyncPlan.ts       pure create/update/delete diff engine (tested, no mocks)
src/lib/brief/calendarSync.ts           orchestrator: syncLinkedCalendar() / unlinkCalendar()
src/db/repos/calendarSyncRepo.ts        CRUD for calendar_sync_links / calendar_sync_events
src/db/drizzle/0003_clumsy_thundra.sql  migration (+ manually mirrored into migrations.ts)
src/features/settings/EchoCalendarSection.tsx   Settings UI — copy in / sync again / remove
```

## File map (Daily Brief MVP — new this session)

```
src/lib/brief/analyzeDay.ts       analyzeDay() -> DaySignals (shared, was duplicated before)
src/lib/brief/dayLoad.ts          classifyDayLoad() -> light/moderate/busy
src/lib/brief/interpretDay.ts     signals -> six Briefs sections, NO/EN, morning/evening variants
src/lib/brief/mockDay.ts          light/moderate/busy mock event scenarios
src/features/brief/DayLoadCard.tsx
src/features/brief/BriefTextCard.tsx
src/features/brief/ImportantItemsCard.tsx
app/(tabs)/brief.tsx              rewritten to render interpretDay() output (mock data + scenario switcher)
```

---

*echoflow / remindifier — product name lowercase in UI.*
