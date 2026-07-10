import { getClerkInstance } from "@clerk/clerk-expo";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StackActions } from "@react-navigation/native";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { BlurView } from "expo-blur";
import Constants from "expo-constants";
import { Redirect, Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View, type ViewProps } from "react-native";
import { useBootstrapApp } from "@/bootstrap/useBootstrapApp";
import migrations from "@/db/drizzle/migrations";
import { hasCompletedOnboarding } from "@/db/repos/userRepo";
import type * as schema from "@/db/schema";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";
import { DEV_BYPASS_AUTH, DEV_USER_ID } from "@/features/auth/devBypass";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { useTranslation } from "@/i18n";
import { triggerSelection } from "@/lib/haptics";
import { logger } from "@/lib/logger";
import { useAppTheme } from "@/theme/ThemeProvider";
import { TAB_BAR_UI } from "@/theme/tokens";
import { FatalScreen, LoadingScreen } from "@/ui/StartupScreens";

const isExpoGo = Constants.appOwnership === "expo";

function TabBarContainer({
  children,
  style,
  isDark,
}: ViewProps & { children: React.ReactNode; isDark: boolean }) {
  if (isExpoGo) {
    return <View style={style}>{children}</View>;
  }
  return (
    <BlurView
      intensity={80}
      tint={isDark ? "systemUltraThinMaterialDark" : "systemUltraThinMaterialLight"}
      style={style}
    >
      {children}
    </BlurView>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme } = useAppTheme();
  const tabUi = TAB_BAR_UI[theme];
  const isDark = theme !== "sand";

  return (
    <TabBarContainer
      isDark={isDark}
      style={{
        position: "absolute",
        bottom: 20,
        left: 33,
        right: 33,
        height: 60,
        borderRadius: 30,
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: isExpoGo ? tabUi.bg : undefined,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.45 : 0.15,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: tabUi.overlay,
        }}
      />
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const accentColor = tabUi.accent;
        const inactiveColor = tabUi.inactive;

        const emojis: Record<string, string> = {
          brief: "☀️",
          day: "📅",
          week: "📊",
        };
        const labels: Record<string, string> = {
          brief: options.title ?? "brief",
          day: options.title ?? "day",
          week: options.title ?? "week",
        };

        return (
          <Pressable
            key={route.key}
            onPress={() => {
              triggerSelection();
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) return;
              // Always land on the tab's root list — reset its nested stack to top
              // whether the tab is already focused or navigated to from another tab.
              const nested = state.routes[index].state;
              const hasNestedHistory =
                nested && typeof nested.index === "number" && nested.index > 0 && nested.key;
              if (!focused) {
                navigation.navigate(route.name);
              }
              if (hasNestedHistory) {
                navigation.dispatch({ ...StackActions.popToTop(), target: nested.key });
              }
            }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 3 }}
          >
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4, lineHeight: 24 }}>
              {emojis[route.name] ?? "●"}
            </Text>
            <Text
              style={{
                fontSize: 10,
                fontFamily: "DMSans_600SemiBold",
                color: focused ? accentColor : inactiveColor,
              }}
            >
              {labels[route.name]}
            </Text>
          </Pressable>
        );
      })}
    </TabBarContainer>
  );
}

function TabsWithBootstrap({
  db,
  userId,
}: {
  db: ExpoSQLiteDatabase<typeof schema>;
  userId: string;
}) {
  const { t } = useTranslation();
  const migrationState = useMigrations(db, migrations);
  const { ready } = useBootstrapApp(userId, migrationState.success);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [migrationTimedOut, setMigrationTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!migrationState.success && !migrationState.error) {
        logger.error("migrations_timeout");
        setMigrationTimedOut(true);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [migrationState.success, migrationState.error]);

  useEffect(() => {
    if (migrationState.success) {
      logger.info("migrations_ready");
    }
    if (migrationState.error) {
      logger.error("migrations_failed", { error: migrationState.error.message });
    }
  }, [migrationState.success, migrationState.error]);

  useEffect(() => {
    if (ready) {
      logger.info("tabs_bootstrap_ready");
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) {
      setOnboardingChecked(false);
      return;
    }
    let cancelled = false;
    hasCompletedOnboarding(userId)
      .then((completed) => {
        if (!cancelled) {
          setNeedsOnboarding(!completed);
          setOnboardingChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNeedsOnboarding(false);
          setOnboardingChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ready, userId]);

  useEffect(() => {
    if (ready && onboardingChecked && !needsOnboarding) {
      logger.info("tabs_render");
    }
  }, [ready, onboardingChecked, needsOnboarding]);

  if (migrationState.error || migrationTimedOut) {
    return (
      <FatalScreen
        message={
          migrationState.error?.message ??
          "Database migrations timed out. Try closing Expo Go fully and reopening."
        }
      />
    );
  }

  if (!ready || !onboardingChecked) {
    return <LoadingScreen message={t("startup.preparingData")} />;
  }

  if (needsOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs tabBar={(props) => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="brief" options={{ title: t("tabs.brief") }} />
      <Tabs.Screen name="day" options={{ title: t("tabs.day") }} />
      <Tabs.Screen name="week" options={{ title: t("tabs.week") }} />
    </Tabs>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded, userId } = useAppAuth();
  const effectiveUserId = isSignedIn
    ? DEV_BYPASS_AUTH
      ? DEV_USER_ID
      : (userId ?? getClerkInstance().session?.user?.id ?? null)
    : null;
  const { db, loading, error } = useUserDrizzleDb(effectiveUserId);

  useEffect(() => {
    if (loading) logger.info("tabs_db_loading");
    if (db) logger.info("tabs_db_ready");
    if (error) logger.error("tabs_db_failed", { error: error.message });
  }, [loading, db, error]);

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
