import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileHeaderLink } from "@/features/auth/ProfileHeaderLink";
import { LanguagePicker } from "@/ui/LanguagePicker";
import { ThemeToggle } from "@/ui/ThemeToggle";

export function AppShell({
  children,
  showThemeToggle = true,
  showProfileLink = true,
  showLanguagePicker = true,
}: {
  children: ReactNode;
  showThemeToggle?: boolean;
  showProfileLink?: boolean;
  showLanguagePicker?: boolean;
}) {
  const showHeader = showThemeToggle || showProfileLink || showLanguagePicker;

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {showHeader ? (
        <View className="flex-row items-center justify-between px-4 pt-1 pb-1">
          {showLanguagePicker ? <LanguagePicker /> : <View />}
          <View className="flex-row items-center gap-3">
            {showProfileLink ? <ProfileHeaderLink /> : null}
            {showThemeToggle ? <ThemeToggle /> : null}
          </View>
        </View>
      ) : null}
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
