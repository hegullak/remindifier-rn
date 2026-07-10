# remindifier-rn — project memory

Living context for AI agents. **Update this file** when architecture, UX, or conventions change.
Last updated: 2026-06-09.

## Branding

- **Product name (UI):** **echoflow** (always lowercase in user-facing copy — use `t("common.appName")`)
- **Repo / package / bundle ID:** still `remindifier-rn` / `com.hegullak.remindifier` until Phase C rebrand
- **QR wire format:** still `{ remindifier: 1, … }` until Phase B dual-protocol
- Rebrand phases: A = UI+i18n + header mark (done) · B = code names + QR dual support · C = bundle ID, scheme, Clerk redirects
- **Mark:** `EchoflowMark` — concentric echo rings (slate accent `#7EB8D4`); used on **splash** (`app.json` + `expo-splash-screen`), **app icon** (`assets/icon.png`), and **LoadingScreen**; not shown in tab header. Source reference: `assets/echonote-reference.png`, master PNG `assets/echoflow-icon-1024.png`

## Session handoff (read every time)

| File | Role |
|------|------|
| **`claude-current-remindifier-state.md`** | Session snapshot — update **only when user requests SESSION HANDOFF** |
| **`PROJECT_MEMORY.md`** (this file) | Stable architecture — update only when conventions change |

Agent protocol: `.cursor/rules/session-handoff.mdc` · Skill: `.cursor/skills/project-memory/SKILL.md`  
Hooks: `.cursor/hooks/session-start.js` (inject memory) · `session-stop.js` does **not** auto-handoff

## What this app is

**Samvittighet-as-a-Service. Gets opened every morning.**

A contextual memory and heads-up assistant for the people in your life — not a CRM, not a social network, not a guilt machine. **echoflow** surfaces the right context at the right moment so you show up better for the people who matter, without any maintenance burden.

- **Event-driven, not form-driven.** Person profiles build up naturally through events and interactions. You never sit down to "fill in" a profile.
- **Opportunity, not failure.** Never "you haven't spoken to Lars in 47 days." Always "Lars has a birthday Thursday — good moment to reach out."
- **Local-first, privacy-first.** All data encrypted on device. No tracking. No external SDKs.

- **Repo**: `hegullak/remindifier-rn`, main dev branch: `sandbox`
- **Stack**: Expo SDK 54, expo-router, NativeWind v4, Drizzle + expo-sqlite (SQLCipher), Clerk
- **Docs**: Always check https://docs.expo.dev/versions/v56.0.0/ before Expo APIs (see `AGENTS.md`)

## Navigation & screens

| Route | Purpose |
|-------|---------|
| `app/(tabs)/brief.tsx` | Home — greeting, pill cards, Dagen min / Uken min |
| `app/intake.tsx` | Semantic voice/text capture — parse → preview → confirm/inbox |
| `app/(tabs)/gather/` | Events — list, create (AI prep), detail, talking points |
| `app/(tabs)/people/` | People list, detail, new, edit |
| `app/(tabs)/myself.tsx` | User profile + QR (toggle Show/Hide QR) |
| `app/settings.tsx` | Clerk account, privacy accordion, data export/delete, about |
| `app/sign-in.tsx` | Auth gate |
| `app/me-scan.tsx` | QR scanner → prefill new person |

**Header** (`src/ui/AppShell.tsx`): left empty on tab roots; sub-screens pass `headerLeft` (back). Right: + menu and avatar (→ profile BottomSheet: settings + **Gitar-tema**). **Status bar:** `expo-status-bar` in `app/_layout.tsx` — `light` on dark themes, `dark` on sand; `app.json` `userInterfaceStyle: automatic`.

**Tabs**: `brief`, `gather`, `people`, `myself` (not “me” / “meg” as route name).

## i18n (mandatory for UI strings)

- **Code language**: English (identifiers, comments, file names)
- **UI copy**: `src/i18n/locales/en.ts` (source keys) + `no.ts` (`satisfies Translations`)
- **Usage**: `useTranslation()` → `t("brief.reorderHint")` with `{param}` interpolation
- **Persistence**: locale in SecureStore (`remindifier.locale`)
- **Terminology (NO)**:
  - “Merkedager” (not “røde dager”) — EN: “Red-letter days” / section title “… this week”
  - Brief section `brief.sections.redLetter` = “Merkedager denne uken” / “Red-letter days this week”
- **Kinds** (DB values stay English): display via `redLetterKindLabel()` / `redLetterDisplayLabel()` in `src/i18n/redLetterKinds.ts`
- **Timeline text**: `upcomingRedLetterDays(rows, today, windowDays, locale)` — always pass `locale`
- **Demo schedule** (seed id `s1`): localized in `src/features/brief/briefContent.ts` → `localizeScheduleItem`
- **Do not** hardcode user-visible strings in components; extend `en.ts` + `no.ts` together

## Brief

- Data hook: `src/features/brief/useBriefData.ts` — reloads on `locale` change
- **Layout (top → bottom):** greeting (`text-5xl`) → date line (`BriefDateHeader`: «fredag 30. mai · UKE 22», white `text-3xs`) → ambient wind-down/morning (20:30+ / 06–09) → **Dagen min** → **I morgen** → **Uken min**
- **Week picker** (← date range →) hidden for now; `weekOffset` still in hook for later
- **Dagen min:** upcoming today + training; passed timed events in collapsible dropdown (non-navigable in Brief; still in Events tab)
- **I morgen:** always shown when `tomorrowItems.length > 0` (not evening-only)
- **Uken min:** collapsed card for rest-of-week (`sortKey >= 2`); tomorrow excluded (lives in I morgen)
- **Device calendars (readonly):** `fetchCalendarBriefEvents` reads selected calendars only (`userRepo.getSelectedCalendarIds`); default = all. User picks calendars in **Settings → Kalendere i Brief** (`CalendarSelectionSection`). Never writes to device calendar.
- **Expo Go + calendar:** `expo-calendar` read API does **not** work in Expo Go on iPhone (iOS 17+ needs `NSCalendarsFullAccessUsageDescription` in the host app binary). `calendarAccess.ts` detects `Constants.appOwnership === "expo"` and skips fetch; Brief shows `CalendarAccessNotice`. Real calendar requires a **development build** (EAS or `npx expo run:ios` on Mac). In `__DEV__`, demo stubs still show for layout testing.
- **Dev calendar stubs:** `devCalendarStubs.ts` — in `__DEV__` only, injects 3 Privat tomorrow events when the week fetch returns zero events; seed mirror in `seedCalendar.ts`
- **Body text:** use `"\n"` as sentence separator in brief bodies; renderer splits on `"\n"` — never `". "` (breaks «kl. 09:00»)
- Static demo content: `getHeadsupItems(locale)`, `getFallbackTraining(locale)` in `briefContent.ts`
- **Push-Pull-Legs:** session names stay English in all locales; active day highlighted via `PplSessionLabel` (`src/ui/PplSessionLabel.tsx`) — never translate to e.g. «Trekk»
- Section order: per-user in DB, draggable list in `brief.tsx`
- **Tab bar:** `FloatingTabBar` with `expo-blur` in dev client; **Expo Go** (`Constants.appOwnership === "expo"`) uses solid `View` fallback

### NativeWind (brief + app-wide)

- Use **preset classes** (`text-5xl`, `pt-6`, `pb-8`, `text-sm`, `text-base`, `text-xl`) — avoid arbitrary `text-[15px]` (silently dropped without safelist)
- **Custom typography tokens** in `tailwind.config.js`: `text-2xs` (10px), `text-3xs` (11px), `text-body` (13px), `text-body-lg` (15px), `text-nav` (22px)
- **Inline `style={{}}`** only when value is absent from Tailwind scale (e.g. `text-[28px]` greeting — rare one-offs)
- Discuss before introducing non-generic / non-reusable solutions

### Semantic intake (`app/intake.tsx`)

- Entry: global **+** menu → «Speak or type» / «Si eller skriv»
- Flow: type/paste/iOS keyboard dictation → `parseSemanticIntake` (proxy + heuristic fallback) → preview card → confirm / edit / inbox
- **No in-app audio recorder** — voice = iOS keyboard dictation only until #38 STT/record is built
- **No auto-save** on parse; confirm creates gathering or follow-up; inbox → AsyncStorage (`intakeInboxRepo`)
- Parser: `src/lib/intake/parseSemanticIntake.ts` (API) + `semanticIntakeParser.ts` (local heuristics, offline fallback)
- **Multiple follow-ups:** parser can emit several bullets (e.g. «husk å … og om …», «nevnte at …», «vil også ta opp at …»); preview shows a bullet list; edit mode = one reminder per line (`intake.followUpPlaceholder`); `applySemanticIntakeEdits` splits `followUpText` on newlines
- **Datetime conflict:** when raw text mentions two distinct weekday+time pairs (e.g. onsdag 12 vs torsdag 13), parser sets `scheduledAtOptions[]` + ambiguity `datetime_conflict`; preview shows tappable choices; Confirm disabled until user picks; datetime scan uses **full `rawText`** (not follow-up-stripped remainder)
- **Intake TextInput:** use explicit `style` colors via `useAppTheme` — NativeWind `className` on `TextInput` can hide dictation text on iOS

## Auth (Clerk)

- Root: `SafeAreaProvider` → `ClerkProvider` → `LanguageProvider` → `ThemeProvider` → `RootStack` in `app/_layout.tsx`
- **Do not use `ClerkLoaded`** (renders null while loading → blank dark screen); use `useAuth().isLoaded` + `LoadingScreen` instead
- Screens: `AuthScreen`, `SignInScreen`, `SignUpScreen`, `OAuthButtons`
- Session helpers: `src/features/auth/clerk/session.ts` — `signInStatusMessage(status, locale)`
- Sign-in copy: `signInFormHelpers.ts` + `signInForm.*` keys
- Env: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (never commit `.env`)

## Data layer

- Schema: `src/db/schema.ts` — Drizzle migrations in `src/db/drizzle/`
- Per-user encrypted DB via `useUserDrizzleDb` / `getDrizzleDbForUser`
- DB key in SecureStore (`drizzleClient.ts`) — **same options** on get and set (`keychainService` + `WHEN_UNLOCKED`)
- Repos: `peopleRepo`, `briefRepo`, `myProfileRepo`, `settingsRepo`, `userRepo`
- Seed: `src/db/seed.ts` (demo people, schedule `s1`, etc.)
- **Bootstrap** (`useBootstrapApp`): seeds local data + preferences (per-step try/catch, logs `bootstrap_ready`); **calendar seed runs in background** (never block UI on `requestCalendarPermissionsAsync`)
- Tabs layout logs `migrations_ready` / `tabs_bootstrap_ready`; 15s migration timeout → `FatalScreen`
- Red-letter kinds in DB: `Birthday`, `Anniversary`, `Smoke-free`, `Snus-free`, `Other`

## Myself / QR

- `MyselfProfileScreen` — local profile in SQLite; QR payload `src/lib/me/qr-payload.ts`
- `QrCodeView` — no react-native-svg (canvas/text QR)
- Scan flow: `me-scan.tsx` → `people/new` with prefill params

## Settings

- `AccountSettingsSection` — compact Clerk name + edit/password sheets
- `SettingsAccordion` — privacy & data collapsed by default
- Export/delete: `app/settings.tsx` + `settingsRepo`

## Logging

- `src/lib/logger.ts`, `globalErrorHandler.ts`, `logUtils.ts`
- Device logs under Documents; dev also `expo-output.log` via `npm run start:lan:log`
- **Startup debug sequence:** `app_launched` → `root_stack_ready` → `index_ready` → `tabs_db_ready` → `migrations_ready` → `bootstrap_ready` → `tabs_render`

## EAS development build (vs Expo Go)

| | **Expo Go** | **EAS dev build** |
|---|-------------|-------------------|
| App on phone | Generic Expo Go from App Store | **echoflow** installed as its own app |
| Native config | Fixed (camera, etc. only) | **Your** `app.json` plugins (calendar, SQLCipher, …) |
| JS workflow | Scan QR → instant reload | Scan QR → instant reload (same Metro) |
| Rebuild native | Never | Only when native deps/config change |
| iPhone calendar | ❌ Not available | ✅ After granting permission |

**One-time setup** (from repo root, Windows OK for iOS cloud build):

1. `npx eas login` — Expo account (free tier includes dev builds)
2. `npx eas init` — links project; writes `expo.extra.eas.projectId` into `app.json`
3. `npx eas secret:create --scope project --name EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY --value pk_…` (and other `EXPO_PUBLIC_*` from `.env`)
4. **iPhone (physical):** `npm run build:dev:ios` — requires **paid Apple Developer** account for signing; install via QR/link when build finishes
5. **Android:** `npm run build:dev:android` — install APK from EAS dashboard
6. Daily dev: `npm run start:dev` → open **echoflow** dev app (not Expo Go) → scan QR

Config: `eas.json` profiles `development` (device), `development-simulator` (iOS sim, Mac). Package: `expo-dev-client`. Rebuild after changing native plugins in `app.json`.

## Tooling & conventions

- **Lint/format**: Biome (`npm run lint:fix`)
- **Types**: `npm run typecheck`
- **Tests**: Jest — `npm run check` before merge (lint + typecheck + coverage); unit tests in `src/lib/__tests__/`; integration in `tests/integration/` (`npm run test:integration`); Maestro smoke locally in `.maestro/` (not CI)
- **CI (GitHub Actions)**: runs on PR/push to `sandbox` (and `develop`/`master`); single job; skips `*.md`-only changes and commits with `[skip ci]`; use **Actions → ci → Run workflow** for manual runs; Maestro is never billed on GitHub
- **Styling**: NativeWind preset classes (not arbitrary `text-[Xpx]`); pair critical layout (`flex: 1`, bg) with inline `style` fallback on shell screens; fonts Lora (headings) + DM Sans (body)
- **Commits**: end each agent session with a commit if there are code changes; never commit `.env`, `expo-output.log`, `coverage/`, `node_modules/`
- **Session git**: start with `git pull --rebase origin sandbox`; end with commit + `git push origin sandbox`
- **Scope**: minimal diffs; match existing patterns; no over-engineering

## Env vars (optional)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (required) |
| `EXPO_PUBLIC_PARSE_API_URL` | Cloudflare Worker base URL for GPT parsing (`POST /api/parse`); omit for local-only heuristics |

## Common pitfalls

1. Adding `as const` to `en.ts` breaks `no.ts` typing — use plain object + `satisfies Translations` on `no`
2. Forgetting `locale` in `upcomingRedLetterDays` / `formatBriefDateLine`
3. Translating DB-stored user content (names, notes) — only system/chrome strings
4. Expo SDK/API changes — verify v56 docs, not old blog posts
5. **`expo-haptics`** must match SDK 54 (`~15.0.8`) — v56 package breaks Expo Go
6. **Bootstrap** must not `await seedDevCalendar()` — calendar permission can hang UI in Expo Go
7. **RN StyleSheet** — do not use CSS `var(--token)` for `backgroundColor`; use hex or theme hook
8. **`ClerkLoaded`** renders nothing while Clerk loads — use explicit `LoadingScreen` + `useAuth().isLoaded`
9. **`ThemeProvider`** must not block children on SecureStore; apply stored theme async with default slate + style fallback. Themes: `sand` | `slate` | `guitar` — guitar uses `.guitar` CSS class in `global.css` (overrides `.dark` tokens); `themeClassFor("guitar")` → `"dark guitar"`; toggle via HG profile menu. Do **not** use dynamic NativeWind `vars()` on modals (causes remount warnings).
10. **Rules of Hooks** — never place `useEffect` after conditional `return` in layout components (caused Expo Go black screen when bootstrap completed)
11. **`FatalScreen` / `LoadingScreen`** — use `StyleSheet` for guaranteed visibility; do not rely on NativeWind alone for error UI
12. **SecureStore** — `getItemAsync` / `setItemAsync` must use **identical options** (e.g. `keychainService`); mismatch causes «failed to persist database key» on iOS

## File map (quick)

```
app/                    expo-router screens
src/features/           feature screens & hooks (auth, brief, me, people)
src/i18n/               LanguageProvider, locales, translate, redLetterKinds
src/lib/                pure logic (brief, timeline, milestones, me/qr, logger, parse/)
workers/parse-api/      Cloudflare Worker — OpenAI proxy + Clerk JWT
src/db/                 schema, repos, drizzle, seed
src/ui/                 shared UI (AppShell, AppBrand, EchoflowMark, cards, sheets)
src/features/brief/     BriefDateHeader, useBriefData
src/lib/brief/          calendarEvents, devCalendarStubs, calendarWeek
```
