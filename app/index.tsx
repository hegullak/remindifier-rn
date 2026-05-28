import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { LoadingScreen } from "@/ui/StartupScreens";

export default function IndexScreen() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen message="Loading…" />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)/brief" />;
}
