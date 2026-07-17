import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { AuthScreen } from "@/features/auth/AuthScreen";
import { useTranslation } from "@/i18n";
import { LoadingScreen } from "@/ui/StartupScreens";

export default function SignInRoute() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/(tabs)/flow");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (isSignedIn) {
    return <LoadingScreen message={t("startup.signingIn")} />;
  }

  return <AuthScreen />;
}
