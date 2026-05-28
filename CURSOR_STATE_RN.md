# Session State RN — 2026-05-28 (late)

## Project
- `remindifier-rn` (Expo + React Native + NativeWind)
- Goal: migrate web remindifier into a local-first mobile app
- Web reference: `C:\dev\remindifier`

## Runtime / toolchain
- **Expo SDK 54** (`expo@~54.0.0`) for Expo Go on device
- Run: `npm run start:lan:log` → `expo-output.log`
- After theme/metro changes: restart with `--clear`

## Theme (sand / slate)
- **Default: slate (dark)** — matches user preference
- CSS variables in `global.css` (`:root` sand, `.dark` slate)
- `tailwind.config.js` — semantic colors via `var(--*)`, `darkMode: 'class'`
- `src/theme/ThemeProvider.tsx` — persists to SecureStore (`remindifier-theme`)
- `src/ui/ThemeToggle.tsx` — sun/moon in `AppShell` header
- Web slate tokens ported from `remindifier/app/globals.css`

## Navigation
- Bottom tabs: `app/(tabs)/_layout.tsx` — **Brief** | **People**
- People stack: `app/(tabs)/people/_layout.tsx` (list, detail, new, edit)
- `app/index.tsx` → `/(tabs)/brief`

## Auth (Clerk — iOS & Android ready)
- `src/features/auth/AuthScreen.tsx` — OAuth (Google, Apple) + sign-in / sign-up tabs
- `src/features/auth/SignInScreen.tsx` — email/password + 2FA
- `src/features/auth/SignUpScreen.tsx` — email sign-up + verification code
- `src/features/auth/AccountMenu.tsx` — avatar + sign out in `AppShell`
- `src/features/auth/clerk/` — redirect URL, OAuth, Android browser warm-up
- `app/sso-callback.tsx` — OAuth deep link (`remindifier-rn://sso-callback`)
- Setup: `docs/CLERK_NATIVE.md`, `.env.example`
- Expo Go: works with email; enable Google/Apple in Clerk Dashboard + redirect URLs

## Database / repos
- Drizzle + SQLCipher per user
- `peopleRepo` — CRUD, timeline create/delete, `upsertRedLetterDays`
- `briefRepo` — schedule + `listUpcomingRedLetterDays` (real data from `person_red_letter_days` + legacy birthday/anniversary on person)
- `userRepo` — `brief_preferences.sectionOrder` get/set

## Brief screen (`app/(tabs)/brief.tsx`)
- Sections: weather, schedule, heads-up, training, red-letter days
- Section reorder (↑↓) persisted per user
- Red-letter: today + upcoming, “+N more”, tap through to person
- Heads-up + training: static seed content (web parity partial)
- ISO week in date line

## People
- List, detail, new, edit with `AppShell` + theme-aware borders
- `RedLetterDaysSection` on person form (Anniversary, Smoke-free, etc.)
- Timeline entry **delete** (✕ + confirm)
- Red-letter days CRUD on create/edit

## Lib ports from web
- `src/lib/red-letter-day.ts`
- `src/lib/timeline/birthdays.ts`, `red-letter-days.ts`
- `src/lib/brief/sections.ts`

## Styling
- `metro.config.js` + NativeWind v4 (`nativewind/babel`, `jsxImportSource`)
- Prefer `border-border`, `bg-bg`, `text-text1`, `bg-accent` over hardcoded colors

## Not yet ported (web has / RN roadmap)
- Timeline entry **edit** (web also lacks UI)
- Live weather (Open-Meteo)
- `reminders` table / training from DB
- Children on person form (`person_children`)
- Relationship add/edit
- People list search
- Memory / Gather tabs (placeholders on web)
- BYOC encrypted backup (RN-only roadmap)

## Validation
- `npm run typecheck` passes

## Debugging
- `npm run start:lan:log` — user can say “se logg”
