import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileHeaderLink } from "@/features/auth/ProfileHeaderLink";
import { useTranslation } from "@/i18n";
import { triggerLight } from "@/lib/haptics";
import { BottomSheet } from "@/ui/BottomSheet";

function GlobalAddButton() {
  const router = useRouter();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const actions = [
    {
      icon: "🎙️",
      bgClass: "bg-sageLight",
      label: t("global.quickCapture"),
      onPress: () => {
        router.push("/intake");
      },
    },
    {
      icon: "👤",
      bgClass: "bg-green-light",
      label: t("global.newPerson"),
      onPress: () => {
        router.push("/people/new");
      },
    },
    {
      icon: "🌿",
      bgClass: "bg-accent-light",
      label: t("global.newEvent"),
      onPress: () => {
        router.push("/gather/new");
      },
    },
  ];

  return (
    <>
      <Pressable
        onPress={() => {
          triggerLight();
          setOpen(true);
        }}
        hitSlop={10}
        className="w-9 h-9 rounded-full bg-accent items-center justify-center"
        accessibilityLabel="New"
      >
        <Text className="text-xl text-card font-body leading-[22px]">+</Text>
      </Pressable>

      <BottomSheet visible={open} onDismiss={() => setOpen(false)} title={t("global.addTitle")}>
        <View className="gap-3 pt-1">
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => {
                triggerLight();
                setOpen(false);
                action.onPress();
              }}
              className="flex-row items-center gap-4 py-2"
            >
              <View
                className={`w-11 h-11 rounded-xl ${action.bgClass} items-center justify-center`}
              >
                <Text className="text-nav">{action.icon}</Text>
              </View>
              <Text className="text-base text-text1 font-bodyMedium">{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}

export function AppShell({
  children,
  showProfileLink = true,
  showAddButton = true,
  headerLeft,
  headerRight,
  // legacy props — kept for compatibility but ignored
  showThemeToggle: _showThemeToggle,
  showLanguagePicker: _showLanguagePicker,
}: {
  children: ReactNode;
  showProfileLink?: boolean;
  showAddButton?: boolean;
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
          {showAddButton ? <GlobalAddButton /> : null}
          {showProfileLink ? <ProfileHeaderLink /> : null}
        </View>
      </View>
      <View className="flex-1">{children}</View>
    </SafeAreaView>
  );
}
