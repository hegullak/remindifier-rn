import * as AuthSession from "expo-auth-session";

/** Must match `scheme` in app.json */
export const AUTH_SCHEME = "remindifier-rn";

/** Deep link Clerk OAuth / SSO flows return to (configure same URL in Clerk Dashboard). */
export function getClerkRedirectUrl() {
  return AuthSession.makeRedirectUri({
    scheme: AUTH_SCHEME,
    path: "sso-callback",
  });
}
