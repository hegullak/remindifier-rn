import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountMenu } from "@/features/auth/AccountMenu";
import { ProfileHeaderLink } from "@/features/auth/ProfileHeaderLink";
import { ThemeToggle } from "@/ui/ThemeToggle";

export function AppShell({
  children,
  showThemeToggle = true,
}: {
  children: ReactNode;
  showThemeToggle?: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={["top"]}>
      {showThemeToggle ? (
        <View className="flex-row justify-end items-center gap-2 px-4 pt-1 pb-1">
          <ProfileHeaderLink />
          <AccountMenu />
          <ThemeToggle />
        </View>
      ) : null}
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
