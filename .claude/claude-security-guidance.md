# Security guidance for remindifier-rn

remindifier is a privacy-first, local-first relationship memory app.
All personal data is stored encrypted on-device with SQLCipher.
The threat model prioritises protecting sensitive data about third parties
(people the user adds) who have not consented to being in the app.

## Logging
- Never log person names, nicknames, birthdays, relation types, or any field from the `persons` table.
- Never log entry body text from `personEntries`.
- Only log operation names, person IDs (not names), and error codes.
- All logging must go through `logger` from `src/lib/logger.ts` — never `console.log` in production paths.
- `console.log` is only acceptable inside an explicit `if (__DEV__)` guard.

## Database and encryption
- The SQLCipher key must only be read from `expo-secure-store`. Never hardcode, log, or pass it as a prop or through navigation params.
- Never disable `useSQLCipher: true` in the Drizzle client.
- The dead `body_encrypted` column in `personEntries` must remain null — do not implement field-level encryption without a full audit.

## External API calls
- No PII (names, birthdays, relation data, entry text) may be included in any external API request body.
- The only approved external calls are: Clerk auth and future explicitly approved AI calls.
- No external API call may fire automatically on app startup or in the background without explicit user action.
- Any new external API integration must be documented with what data is sent and why.

## AI and natural language features
- Natural language input from the user must be parsed locally before any AI call is considered.
- If an AI call is made, only the user's current input may be sent — never existing person records, entries, or database content.
- No AI response may be auto-saved. The user must explicitly approve before anything is written to the database.

## Auth and keychain
- Clerk JWT token cache must use `WHEN_UNLOCKED` accessibility (not `AFTER_FIRST_UNLOCK`).
- Never store auth tokens in AsyncStorage — only expo-secure-store.

## QR and sharing
- The QR payload must contain only what the user explicitly chose to share from their own profile.
- `exportAllData` must never include log files (`app.log`, `error.log`).

## General
- No external SDKs for crash reporting, analytics, or tracking (no Sentry, Bugsnag, Amplitude, etc.).
- Never write "Remindifier" — always "remindifier".
