import { Linking, Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import type { CalendarAccessStatus } from "@/lib/brief/calendarEvents";

type Props = {
  access: CalendarAccessStatus;
  hasDevStubs: boolean;
};

export function CalendarAccessNotice({ access, hasDevStubs }: Props) {
  const { t } = useTranslation();

  if (access === "granted") return null;

  const isExpoGo = access === "expo_go";
  const title = isExpoGo
    ? t("brief.calendarAccess.expoGoTitle")
    : t("brief.calendarAccess.deniedTitle");
  const body = isExpoGo
    ? t("brief.calendarAccess.expoGoBody")
    : t("brief.calendarAccess.deniedBody");
  const showSettings = access === "denied" || access === "error";

  return (
    <View className="mb-4 rounded-xl border border-amber/30 bg-amber/10 px-4 py-3">
      <Text className="text-body font-bodySemi text-text1 mb-1">{title}</Text>
      <Text className="text-sm text-text2 font-body leading-[20px]">{body}</Text>
      {hasDevStubs ? (
        <Text className="text-xs text-text3 font-body mt-2">{t("brief.calendarAccess.devStubsNote")}</Text>
      ) : null}
      {showSettings ? (
        <Pressable
          onPress={() => void Linking.openSettings()}
          className="mt-3 self-start active:opacity-70"
          accessibilityRole="button"
        >
          <Text className="text-sm text-accent font-bodySemi">{t("brief.calendarAccess.openSettings")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
