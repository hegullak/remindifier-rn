# Clerk — native (iOS & Android)

remindifier-rn (product: **echoflow**) uses `@clerk/clerk-expo` with flows that work in **Expo Go** today and the same code paths in **EAS dev/production builds**.

## What is implemented

| Feature | iOS | Android | Notes |
|--------|-----|---------|--------|
| Email + password sign-in | ✓ | ✓ | `SignInScreen` + 2FA (TOTP, email/phone code, backup) + **Client Trust** on new devices |
| Email sign-up + verification | ✓ | ✓ | `SignUpScreen` |
| Google OAuth | ✓ | ✓ | `useSSO` + in-app browser |
| Apple Sign In | ✓ (native) | ✓ (OAuth browser) | iOS: `expo-apple-authentication`; Android: `oauth_apple` |
| Secure token cache | ✓ | ✓ | `@clerk/clerk-expo/token-cache` + SecureStore |
| Sign out | ✓ | ✓ | Account menu in `AppShell` |
| Deep link callback | ✓ | ✓ | `remindifier-rn://sso-callback` → `app/sso-callback.tsx` |

## Clerk Dashboard setup

1. **API keys** → copy publishable key to `.env` as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (see `.env.example`).
2. **User & authentication** → enable Email, Google, Apple as needed.
3. **SSO / OAuth redirect URLs** — add **both**:
   - `remindifier-rn://sso-callback` (production / dev client with custom scheme)
   - Expo Go dev URL: run the app once and log `getClerkRedirectUrl()` from `src/features/auth/clerk/config.ts`, or check Clerk/Metro — typically `exp://<lan-ip>:8081/--/sso-callback`

## App identifiers (store builds)

Configured in `app.json` for when you create iOS/Android binaries:

- iOS `bundleIdentifier`: `com.hegullak.remindifier`
- Android `package`: `com.hegullak.remindifier`

Update Apple/Google OAuth client IDs in Clerk when you register these bundle IDs.

## Optional later (not required for Expo Go)

- **Passkeys**: `@clerk/expo-passkeys` + dev build
- **Biometric unlock**: `expo-local-authentication` + Clerk local credentials
- **Prebuilt UI**: `<SignIn />` / `<SignUp />` from `@clerk/clerk-expo` (web-oriented; we use custom NativeWind screens)

## Code map

- `app/_layout.tsx` — `ClerkProvider`, `tokenCache`, `SignedIn` / `SignedOut`
- `src/features/auth/AuthScreen.tsx` — OAuth + sign-in / sign-up tabs
- `src/features/auth/clerk/` — redirect URL, OAuth buttons, browser warm-up
- `src/features/auth/AccountMenu.tsx` — profile + sign out
