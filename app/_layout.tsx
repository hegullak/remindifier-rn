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
import { SafeAreaView, Text, View } from "react-native";
import "../global.css";
import { useBootstrapApp } from "@/bootstrap/useBootstrapApp";
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
      <ClerkLoaded>
        <RootNavigation />
      </ClerkLoaded>
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

  if (!fontsLoaded) return null;
  if (dbError) return <FatalScreen message={dbError.message} />;
  if (dbLoading || !db) return null;
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
        {!ready ? null : (
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#EDE9E2" },
            }}
          />
        )}
      </SignedIn>
      <SignedOut>
        <SignedOutScreen />
      </SignedOut>
    </>
  );
}

function SignedOutScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-[30px] leading-[36px] text-text1 font-heading">
          remindifier
        </Text>
        <Text className="text-[15px] text-text2 font-body mt-3">
          Sign in to unlock your local encrypted memory space on this device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

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
