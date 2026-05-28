import "react-native-gesture-handler";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
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
import "../global.css";
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
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ThemeProvider>
        <ClerkLoaded>
          <RootStack />
        </ClerkLoaded>
      </ThemeProvider>
    </ClerkProvider>
  );
}

function RootStack() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {
        // no-op
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <LoadingScreen message="Loading fonts…" />;
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
