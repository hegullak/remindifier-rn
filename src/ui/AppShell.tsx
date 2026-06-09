import type { ReactNode } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileHeaderLink } from "@/features/auth/ProfileHeaderLink";
import { useAppTheme } from "@/theme/ThemeProvider";
import { AppBrand } from "@/ui/AppBrand";
import { GlobalAddButton, type AddMenuAction, type AddMenuSection } from "@/ui/GlobalAddButton";

export function AppShell({
  children,
  showProfileLink = true,
  showAddButton = true,
  addMenuSections,
  addMenuPrepend,
  addMenuPrependTitle,
  headerLeft,
  headerRight,
  // legacy props — kept for compatibility but ignored
  showThemeToggle: _showThemeToggle,
  showLanguagePicker: _showLanguagePicker,
}: {
  children: ReactNode;
  showProfileLink?: boolean;
  showAddButton?: boolean;
  addMenuSections?: AddMenuSection[];
  addMenuPrepend?: AddMenuAction[];
  addMenuPrependTitle?: string;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  showThemeToggle?: boolean;
  showLanguagePicker?: boolean;
}) {
  const { bg } = useAppTheme();
  return (
    <SafeAreaView className="flex-1 bg-bg" style={{ flex: 1, backgroundColor: bg }} edges={["top"]}>
      <View className="flex-row items-center px-4 pt-1 pb-1 min-h-[44px]">
        <View className="flex-1 min-w-0 items-start justify-center">{headerLeft ?? <AppBrand />}</View>
        <View className="flex-row items-center gap-3">
          {headerRight ?? null}
          {showAddButton ? (
            <GlobalAddButton
              prependSections={addMenuSections}
              prependSectionTitle={addMenuPrependTitle}
              prependActions={addMenuPrepend}
            />
          ) : null}
          {showProfileLink ? <ProfileHeaderLink /> : null}
        </View>
      </View>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
