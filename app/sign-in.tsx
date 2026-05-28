import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { LoadingScreen } from "@/ui/StartupScreens";

export default function SignInRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/(tabs)/brief");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <LoadingScreen message="Loading…" />;
  }

  if (isSignedIn) {
    return <LoadingScreen message="Logger inn…" />;
  }

  return <AuthScreen />;
}
