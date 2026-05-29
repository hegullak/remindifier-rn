import { Redirect } from "expo-router";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { useTranslation } from "@/i18n/LanguageContext";
import { LoadingScreen } from "@/ui/StartupScreens";

export default function IndexScreen() {
  const { isSignedIn, isLoaded } = useAppAuth();
  const { t } = useTranslation();

  if (!isLoaded) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)/brief" />;
}
