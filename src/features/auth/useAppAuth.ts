import { useAuth, useUser } from "@clerk/clerk-expo";
import { DEV_BYPASS_AUTH, DEV_USER_ID, DEV_USER_NAME } from "./devBypass";

export function useAppAuth() {
  const clerkAuth = useAuth();
  if (DEV_BYPASS_AUTH) {
    return {
      isSignedIn: true as const,
      isLoaded: true,
      userId: DEV_USER_ID,
      signOut: async () => {},
      getToken: async () => null as string | null,
    };
  }
  return clerkAuth;
}

export function useAppUser() {
  const clerkUser = useUser();
  if (DEV_BYPASS_AUTH) {
    return {
      isLoaded: true,
      user: { fullName: DEV_USER_NAME, firstName: "Henning", imageUrl: null as string | null },
    };
  }
  return clerkUser;
}
