# remindifier-rn — project memory

Living context for AI agents. **Update this file** when architecture, UX, or conventions change.
Last updated: 2026-05-29.

## What this app is

**Samvittighet-as-a-Service. Gets opened every morning.**

A contextual memory and heads-up assistant for the people in your life — not a CRM, not a social network, not a guilt machine. remindifier surfaces the right context at the right moment so you show up better for the people who matter, without any maintenance burden.

- **Event-driven, not form-driven.** Person profiles build up naturally through events and interactions. You never sit down to "fill in" a profile.
- **Opportunity, not failure.** Never "you haven't spoken to Lars in 47 days." Always "Lars has a birthday Thursday — good moment to reach out."
- **Local-first, privacy-first.** All data encrypted on device. No tracking. No external SDKs.

- **Repo**: `hegullak/remindifier-rn`, main dev branch: `sandbox`
- **Stack**: Expo SDK 54, expo-router, NativeWind v4, Drizzle + expo-sqlite (SQLCipher), Clerk
- **Docs**: Always check https://docs.expo.dev/versions/v56.0.0/ before Expo APIs (see `AGENTS.md`)

## Navigation & screens

| Route | Purpose |
|-------|---------|
| `app/(tabs)/brief.tsx` | Home — draggable sections (weather, schedule, headsup, training, merkedager) |
| `app/(tabs)/people/` | People list, detail, new, edit |
| `app/(tabs)/myself.tsx` | User profile + QR (toggle Show/Hide QR) |
| `app/settings.tsx` | Clerk account, privacy accordion, data export/delete, about |
| `app/sign-in.tsx` | Auth gate |
| `app/me-scan.tsx` | QR scanner → prefill new person |

**Header** (`src/ui/AppShell.tsx`): 🇳🇴/🇬🇧 `LanguagePicker` left; theme + avatar (→ `/settings`) right. No ⋯ menu.

**Tabs**: `brief`, `people`, `myself` (not “me” / “meg” as route name).

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

## Brief / weather

- Data hook: `src/features/brief/useBriefData.ts` — reloads on `locale` change
- Weather: `src/lib/brief/weather.ts` + `weatherLocation.ts`
  - GPS via `expo-location` → else `EXPO_PUBLIC_BRIEF_WEATHER_LAT/LON` → default Hagavik
  - Place name: Open-Meteo reverse geocoding
  - Open-Meteo forecast API; expanded card shows icon grid (wind, rain, feels like, humidity, cloud, location, updated)
- Static demo content: `getHeadsupItems(locale)`, `getFallbackTraining(locale)` in `briefContent.ts`
- Section order: per-user in DB, draggable list in `brief.tsx`

## Auth (Clerk)

- `ClerkProvider` in `app/_layout.tsx` + `LanguageProvider` + `ThemeProvider`
- Screens: `AuthScreen`, `SignInScreen`, `SignUpScreen`, `OAuthButtons`
- Session helpers: `src/features/auth/clerk/session.ts` — `signInStatusMessage(status, locale)`
- Sign-in copy: `signInFormHelpers.ts` + `signInForm.*` keys
- Env: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (never commit `.env`)

## Data layer

- Schema: `src/db/schema.ts` — Drizzle migrations in `src/db/drizzle/`
- Per-user encrypted DB via `useUserDrizzleDb` / `getDrizzleDbForUser`
- Repos: `peopleRepo`, `briefRepo`, `myProfileRepo`, `settingsRepo`, `userRepo`
- Seed: `src/db/seed.ts` (demo people, schedule `s1`, etc.)
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

## Tooling & conventions

- **Lint/format**: Biome (`npm run lint:fix`)
- **Types**: `npm run typecheck`
- **Tests**: Jest (`npm test`) — lib tests under `src/lib/__tests__/`
- **Styling**: NativeWind class names; fonts Lora (headings) + DM Sans (body)
- **Commits**: only when user asks; never commit `.env`, `expo-output.log`, `coverage/`, `node_modules/`
- **Scope**: minimal diffs; match existing patterns; no over-engineering

## Env vars (optional)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk (required) |
| `EXPO_PUBLIC_BRIEF_WEATHER_LAT` / `LON` | Weather fallback coordinates |
| `EXPO_PUBLIC_BRIEF_WEATHER_PLACE` | Place label if geocoding fails |

## Common pitfalls

1. Adding `as const` to `en.ts` breaks `no.ts` typing — use plain object + `satisfies Translations` on `no`
2. Forgetting `locale` in `upcomingRedLetterDays` / `fetchBriefWeather` / `formatBriefDateLine`
3. Translating DB-stored user content (names, notes) — only system/chrome strings
4. Expo SDK/API changes — verify v56 docs, not old blog posts

## File map (quick)

```
app/                    expo-router screens
src/features/           feature screens & hooks (auth, brief, me, people)
src/i18n/               LanguageProvider, locales, translate, redLetterKinds
src/lib/                pure logic (brief, timeline, milestones, me/qr, logger)
src/db/                 schema, repos, drizzle, seed
src/ui/                 shared UI (AppShell, cards, sheets, LanguagePicker)
```
