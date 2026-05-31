import "react-native-gesture-handler";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import { Lora_400Regular } from "@expo-google-fonts/lora";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { tokenCache } from "@/features/auth/clerk/tokenCache";
import { installGlobalErrorLogger } from "@/lib/globalErrorHandler";
import { logger } from "@/lib/logger";
import "../global.css";
import { LanguageProvider, useTranslation } from "@/i18n";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { LoadingScreen } from "@/ui/StartupScreens";

SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op
});

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <LanguageProvider>
          <ThemeProvider>
            <ClerkLoaded>
              <RootStack />
            </ClerkLoaded>
          </ThemeProvider>
        </LanguageProvider>
      </ClerkProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { t } = useTranslation();
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    logger.info("app_launched");
    installGlobalErrorLogger();
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // no-op
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <LoadingScreen message={t("startup.loadingFonts")} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "var(--bg)" },
      }}
    />
  );
}
