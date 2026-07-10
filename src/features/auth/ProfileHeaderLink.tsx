import { useUser } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { UserAvatar } from "@/features/auth/UserAvatar";
import { useTranslation } from "@/i18n";
import { triggerLight } from "@/lib/haptics";
import { useAppTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/ui/BottomSheet";

export function ProfileHeaderLink() {
  const { user } = useUser();
  const router = useRouter();
  const { t } = useTranslation();
  const { theme, toggleGuitarTheme } = useAppTheme();
  const [open, setOpen] = useState(false);

  const guitarActive = theme === "guitar";

  function closeAnd(fn: () => void) {
    triggerLight();
    setOpen(false);
    fn();
  }

  return (
    <>
      <Pressable
        onPress={() => {
          triggerLight();
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t("profile.menuTitle")}
        hitSlop={6}
        className="opacity-95 active:opacity-70"
      >
        <UserAvatar user={user} size={34} />
      </Pressable>

      <BottomSheet visible={open} onDismiss={() => setOpen(false)} title={t("profile.menuTitle")}>
        <View className="gap-1 pt-1">
          <Pressable
            onPress={() => closeAnd(() => router.push("/settings"))}
            className="flex-row items-center gap-4 py-3 active:opacity-70"
          >
            <View className="w-11 h-11 rounded-xl bg-accent-light items-center justify-center">
              <Text className="text-nav">⚙️</Text>
            </View>
            <Text className="text-base text-text1 font-bodyMedium">{t("profile.settings")}</Text>
          </Pressable>

          <View className="h-px bg-border my-1" />

          <Pressable
            onPress={() => closeAnd(() => toggleGuitarTheme())}
            className="flex-row items-center gap-4 py-3 active:opacity-70"
            accessibilityRole="button"
            accessibilityState={{ selected: guitarActive }}
          >
            <View
              className="w-11 h-11 rounded-xl items-center justify-center border"
              style={{
                backgroundColor: guitarActive ? "rgba(245,158,11,0.18)" : "rgba(245,158,11,0.08)",
                borderColor: guitarActive ? "rgba(245,158,11,0.45)" : "rgba(245,158,11,0.2)",
              }}
            >
              <Text className="text-nav">🎸</Text>
            </View>
            <View className="flex-1">
              <Text className="text-base text-text1 font-bodyMedium">
                {t("profile.guitarTheme")}
              </Text>
              <Text className="text-body text-text3 font-body mt-0.5">
                {t("profile.guitarThemeHint")}
              </Text>
            </View>
            {guitarActive ? <Text className="text-accent text-lg font-bodySemi">✓</Text> : null}
          </Pressable>
        </View>
      </BottomSheet>
    </>
  );
}
