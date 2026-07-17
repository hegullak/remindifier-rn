import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";

export function DayPickerHeader({
  dateLabel,
  dayOffset,
  onPrev,
  onNext,
  onToday,
}: {
  dateLabel: string;
  dayOffset: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center justify-between mb-4">
      <Pressable
        onPress={onPrev}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("day.previous")}
        className="w-9 h-9 items-center justify-center active:opacity-60"
      >
        <Text className="text-xl text-accent font-body">‹</Text>
      </Pressable>

      <Pressable
        onPress={dayOffset !== 0 ? onToday : undefined}
        disabled={dayOffset === 0}
        accessibilityRole="button"
        accessibilityLabel={t("day.goToToday")}
        className="flex-1 items-center active:opacity-60"
      >
        <Text className="text-body-lg text-text1 font-bodySemi">{dateLabel}</Text>
        {dayOffset !== 0 ? (
          <Text className="text-2xs text-accent font-bodySemi mt-0.5">{t("day.goToToday")}</Text>
        ) : null}
      </Pressable>

      <Pressable
        onPress={onNext}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("day.next")}
        className="w-9 h-9 items-center justify-center active:opacity-60"
      >
        <Text className="text-xl text-accent font-body">›</Text>
      </Pressable>
    </View>
  );
}
