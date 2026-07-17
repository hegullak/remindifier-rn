import { Redirect } from "expo-router";
import { useEffect } from "react";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { useTranslation } from "@/i18n/LanguageContext";
import { logger } from "@/lib/logger";
import { LoadingScreen } from "@/ui/StartupScreens";

export default function IndexScreen() {
  const { isSignedIn, isLoaded } = useAppAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isLoaded) return;
    logger.info("index_ready", { isSignedIn });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/(tabs)/flow" />;
}
