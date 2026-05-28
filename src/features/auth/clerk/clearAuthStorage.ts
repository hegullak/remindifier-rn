import { CLERK_CLIENT_JWT_KEY, tokenCache } from "@/features/auth/clerk/tokenCache";

/** Remove stale native client JWT before/after sign-out so re-login works. */
export async function clearClerkAuthStorage(): Promise<void> {
  await tokenCache.clearToken(CLERK_CLIENT_JWT_KEY);
}
