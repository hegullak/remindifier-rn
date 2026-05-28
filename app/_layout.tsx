import { Stack } from "expo-router";
import { ClerkLoaded, ClerkProvider, SignedIn, SignedOut, useAuth } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { useFonts } from "expo-font";
import { Lora_400Regular } from "@expo-google-fonts/lora";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
} from "@expo-google-fonts/dm-sans";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import "../global.css";
import { useBootstrapApp } from "@/bootstrap/useBootstrapApp";
import { SignInScreen } from "@/features/auth/SignInScreen";
import { ThemeProvider } from "@/theme/ThemeProvider";
import migrations from "@/db/drizzle/migrations";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as schema from "@/db/schema";

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
          <RootNavigation />
        </ClerkLoaded>
      </ThemeProvider>
    </ClerkProvider>
  );
}

function RootNavigation() {
  const [fontsLoaded] = useFonts({
    Lora_400Regular,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  });
  const { userId } = useAuth();
  const { db, loading: dbLoading, error: dbError } = useUserDrizzleDb(userId);

  useEffect(() => {
    if (fontsLoaded && !userId) {
      SplashScreen.hideAsync().catch(() => {
        // no-op
      });
    }
  }, [fontsLoaded, userId]);

  if (!fontsLoaded) return <LoadingScreen message="Loading fonts…" />;
  if (!userId) return <SignInScreen />;
  if (dbError) return <FatalScreen message={dbError.message} />;
  if (dbLoading || !db) return <LoadingScreen message="Opening your encrypted database…" />;
  return <MigratedNavigation db={db} fontsLoaded={fontsLoaded} userId={userId} />;
}

function MigratedNavigation({
  db,
  fontsLoaded,
  userId,
}: {
  db: ExpoSQLiteDatabase<typeof schema>;
  fontsLoaded: boolean;
  userId: string | null | undefined;
}) {
  const migrationState = useMigrations(db, migrations);
  const { ready } = useBootstrapApp(userId, migrationState.success);

  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync().catch(() => {
        // no-op
      });
    }
  }, [fontsLoaded, ready]);

  if (migrationState.error) return <FatalScreen message={migrationState.error.message} />;

  return (
    <>
      <SignedIn>
        {!ready ? (
          <LoadingScreen message="Preparing your local data…" />
        ) : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "var(--bg)" },
            }}
          />
        )}
      </SignedIn>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
    </>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={loadingStyles.container}>
      <ActivityIndicator size="large" color="#C4784A" />
      <Text style={loadingStyles.title}>remindifier</Text>
      <Text style={loadingStyles.message}>{message}</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1E26",
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    color: "#EEF0F5",
    marginTop: 8,
  },
  message: {
    fontSize: 15,
    color: "#8E97AD",
    textAlign: "center",
  },
});

function FatalScreen({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-[22px] leading-[28px] text-text1 font-heading">Startup error</Text>
        <Text className="text-[14px] text-red font-body mt-3">{message}</Text>
      </View>
    </SafeAreaView>
  );
}
