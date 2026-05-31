import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileHeaderLink } from "@/features/auth/ProfileHeaderLink";

export function AppShell({
  children,
  showProfileLink = true,
  headerLeft,
  headerRight,
  // legacy props — kept for compatibility but ignored
  showThemeToggle: _showThemeToggle,
  showLanguagePicker: _showLanguagePicker,
}: {
  children: ReactNode;
  showProfileLink?: boolean;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  showThemeToggle?: boolean;
  showLanguagePicker?: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      <View className="flex-row items-center px-4 pt-1 pb-1 min-h-[44px]">
        <View className="flex-1">{headerLeft ?? null}</View>
        <View className="flex-row items-center gap-3">
          {headerRight ?? null}
          {showProfileLink ? <ProfileHeaderLink /> : null}
        </View>
      </View>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
