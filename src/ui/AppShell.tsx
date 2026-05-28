import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
        <View className="flex-row justify-end px-4 pt-1 pb-1">
          <ThemeToggle />
        </View>
      ) : null}
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
