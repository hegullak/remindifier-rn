import { tokenCache as expoTokenCache } from "@clerk/clerk-expo/token-cache";
import * as SecureStore from "expo-secure-store";

export const CLERK_CLIENT_JWT_KEY = "__clerk_client_jwt";

const secureStoreOpts = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
} as const;

/**
 * Clerk Expo stores the client JWT in SecureStore. The default token cache has no
 * clearToken — signOut leaves a stale JWT and the next sign-in can fail silently
 * or with "session already exists".
 */
export const tokenCache = {
  getToken: (key: string) => expoTokenCache?.getToken(key) ?? Promise.resolve(null),
  saveToken: (key: string, token: string) =>
    expoTokenCache?.saveToken(key, token) ?? SecureStore.setItemAsync(key, token, secureStoreOpts),
  clearToken: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key, secureStoreOpts);
    } catch {
      // no-op — sign-out must not fail if the key is already gone
    }
  },
};
