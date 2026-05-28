import { getClerkInstance, useAuth } from "@clerk/clerk-expo";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useBootstrapApp } from "@/bootstrap/useBootstrapApp";
import migrations from "@/db/drizzle/migrations";
import type * as schema from "@/db/schema";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";
import { useTranslation } from "@/i18n";
import { useAppTheme } from "@/theme/ThemeProvider";
import { FatalScreen, LoadingScreen } from "@/ui/StartupScreens";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.42, lineHeight: 26 }}>{emoji}</Text>;
}

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text className={`text-[11px] font-bodySemi ${focused ? "text-accent" : "text-text3"}`}>
      {label}
    </Text>
  );
}

function TabsWithBootstrap({
  db,
  userId,
}: {
  db: ExpoSQLiteDatabase<typeof schema>;
  userId: string;
}) {
  const { isDark } = useAppTheme();
  const { t } = useTranslation();
  const migrationState = useMigrations(db, migrations);
  const { ready } = useBootstrapApp(userId, migrationState.success);

  if (migrationState.error) {
    return <FatalScreen message={migrationState.error.message} />;
  }

  if (!ready) {
    return <LoadingScreen message={t("startup.preparingData")} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#222838" : "#F7F4EF",
          borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: isDark ? "#7EB8D4" : "#C4784A",
        tabBarInactiveTintColor: isDark ? "#7A8CAD" : "#A89E90",
      }}
    >
      <Tabs.Screen
        name="brief"
        options={{
          title: "Brief",
          tabBarIcon: ({ focused }) => <TabIcon emoji="☀️" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label={t("tabs.brief")} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label={t("tabs.people")} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="myself"
        options={{
          title: "Myself",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🪪" focused={focused} />,
          tabBarLabel: ({ focused }) => <TabLabel label={t("tabs.myself")} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded, userId } = useAuth();
  const effectiveUserId = isSignedIn
    ? (userId ?? getClerkInstance().session?.user?.id ?? null)
    : null;
  const { db, loading, error } = useUserDrizzleDb(effectiveUserId);

  if (!isLoaded) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (!isSignedIn || !effectiveUserId) {
    return <Redirect href="/sign-in" />;
  }

  if (error) {
    return <FatalScreen message={error.message} />;
  }

  if (loading || !db) {
    return <LoadingScreen message={t("startup.openingDatabase")} />;
  }

  return <TabsWithBootstrap db={db} userId={effectiveUserId} />;
}
