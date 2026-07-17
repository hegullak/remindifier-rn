import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";

/** Single-tier week navigation for the dedicated Week screen — mirrors DayPickerHeader. */
export function WeekPickerHeader({
  weekLabel,
  isThisWeek,
  onPrev,
  onNext,
  onReset,
}: {
  weekLabel: string;
  isThisWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between mb-4">
      <Pressable
        onPress={onPrev}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("brief.weekPrev")}
        className="w-9 h-9 items-center justify-center active:opacity-60"
      >
        <Text className="text-xl text-accent font-body">‹</Text>
      </Pressable>

      <Pressable
        onPress={isThisWeek ? undefined : onReset}
        disabled={isThisWeek}
        accessibilityRole="button"
        accessibilityLabel={t("brief.weekThis")}
        className="flex-1 items-center active:opacity-60"
      >
        <Text className="text-body-lg text-text1 font-bodySemi">{weekLabel}</Text>
        {!isThisWeek ? (
          <Text className="text-2xs text-accent font-bodySemi mt-0.5">{t("brief.weekThis")}</Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onNext}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("brief.weekNext")}
        className="w-9 h-9 items-center justify-center active:opacity-60"
      >
        <Text className="text-xl text-accent font-body">›</Text>
      </Pressable>
    </View>
  );
}
