# Session State RN — 2026-05-28

## Project
- `remindifier-rn` (Expo + React Native + NativeWind)
- Goal: migrate web remindifier into a local-first mobile app

## Current architecture status
- Expo Router is configured and active.
- Clerk is integrated for identity only (`@clerk/clerk-expo`).
- Local DB is user-isolated (`remindifier-<userId>.db`).
- Encryption key is per-user in `expo-secure-store`.
- SQLCipher pragma key is applied on DB open.

## Database stack status
- Drizzle ORM is installed and used with Expo SQLite driver.
- Drizzle DB is initialized with `drizzle(expoDb)` in:
  - `src/db/drizzleClient.ts`
- SQLite schema mapping exists in:
  - `src/db/schema.ts`
- Migration files generated via Drizzle Kit:
  - `src/db/drizzle/0000_aromatic_doctor_doom.sql`
  - `src/db/drizzle/meta/_journal.json`
  - runtime migration bundle:
    - `src/db/drizzle/migrations.ts`
- Auto-migration on startup is enabled:
  - `useMigrations` in `app/_layout.tsx`

## Seed and repositories
- Seed is Drizzle-based (`src/db/seed.ts`) with realistic test data.
- `briefRepo` is Drizzle-based:
  - `src/db/repos/briefRepo.ts`
- `peopleRepo` is Drizzle-based with CRUD + timeline ops:
  - list people summaries
  - get profile bundle
  - create/update/delete person
  - create note/follow-up entry
  - file: `src/db/repos/peopleRepo.ts`

## Implemented screens
- `app/brief.tsx`
- `app/people/index.tsx` (list)
- `app/people/[id].tsx` (detail)
- `app/people/new.tsx` (create)
- `app/people/[id]/edit.tsx` (edit + delete)

## Implemented hooks/components
- `src/bootstrap/useBootstrapApp.ts`
- `src/db/useUserDrizzleDb.ts`
- `src/features/brief/useBriefData.ts`
- `src/features/people/usePeopleData.ts`
- `src/features/people/usePersonProfileData.ts` (with `reload()`)
- `src/features/people/PersonForm.tsx`
- UI atoms: `src/ui/BriefCard.tsx`, `src/ui/SectionLabel.tsx`, `src/ui/Tag.tsx`

## UX currently working
- Person CRUD flow end-to-end.
- Add note/follow-up directly on person detail timeline.
- Timeline refreshes after save.

## Environment requirements
- Required env var:
  - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- App throws early if missing.

## Validation status
- `npm run typecheck` passes at latest checkpoint.
- No current lints in recently edited files.

## Suggested next steps
1. Add edit/delete for individual timeline entries.
2. Port red-letter day create/edit UX in RN.
3. Implement brief section reorder + local persistence.
4. Add BYOC foundation modules (cloud provider interface + encrypted backup/restore).
5. Add small integration smoke tests for migrations + seed + people CRUD.
