import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
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
import { SafeAreaProvider } from "react-native-safe-area-context";
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
    <SafeAreaProvider>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <LanguageProvider>
          <ThemeProvider>
            <RootStack />
          </ThemeProvider>
        </LanguageProvider>
      </ClerkProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { t } = useTranslation();
  const { isLoaded: clerkLoaded } = useAuth();
  const [fontsLoaded, fontError] = useFonts({
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
    if (fontError) {
      logger.error("fonts_failed", { error: fontError.message });
    }
  }, [fontError]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {
        // no-op
      });
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (clerkLoaded && (fontsLoaded || fontError)) {
      logger.info("root_stack_ready", { fontsLoaded, fontError: Boolean(fontError) });
    }
  }, [clerkLoaded, fontsLoaded, fontError]);

  if (!clerkLoaded) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (!fontsLoaded && !fontError) {
    return <LoadingScreen message={t("startup.loadingFonts")} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#1A1E26" },
      }}
    />
  );
}
