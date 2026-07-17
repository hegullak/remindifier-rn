import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";

/**
 * Combined day + week navigation on one line: single chevrons (‹ ›) step
 * the day shown in "Dagen min", double chevrons (« ») step the week shown
 * in "Uken min". Tapping the center label resets both to today/this week.
 */
export function DateNavBar({
  dayLabel,
  weekLabel,
  isToday,
  isThisWeek,
  onPrevDay,
  onNextDay,
  onPrevWeek,
  onNextWeek,
  onReset,
}: {
  dayLabel: string;
  weekLabel: string;
  isToday: boolean;
  isThisWeek: boolean;
  onPrevDay: () => void;
  onNextDay: () => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  const isReset = isToday && isThisWeek;

  return (
    <View className="flex-row items-center justify-between mb-3">
      <Pressable
        onPress={onPrevWeek}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("brief.weekPrev")}
        className="w-8 h-8 items-center justify-center active:opacity-60"
      >
        <Text className="text-lg text-accent font-body">«</Text>
      </Pressable>
      <Pressable
        onPress={onPrevDay}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("day.previous")}
        className="w-8 h-8 items-center justify-center active:opacity-60"
      >
        <Text className="text-xl text-accent font-body">‹</Text>
      </Pressable>

      <Pressable
        onPress={isReset ? undefined : onReset}
        disabled={isReset}
        accessibilityRole="button"
        accessibilityLabel={t("day.goToToday")}
        className="flex-1 items-center active:opacity-60"
      >
        <Text className="text-body-lg text-text1 font-bodySemi">{dayLabel}</Text>
        <Text className="text-2xs text-text3 font-bodySemi mt-0.5">{weekLabel}</Text>
      </Pressable>

      <Pressable
        onPress={onNextDay}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("day.next")}
        className="w-8 h-8 items-center justify-center active:opacity-60"
      >
        <Text className="text-xl text-accent font-body">›</Text>
      </Pressable>
      <Pressable
        onPress={onNextWeek}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={t("brief.weekNext")}
        className="w-8 h-8 items-center justify-center active:opacity-60"
      >
        <Text className="text-lg text-accent font-body">»</Text>
      </Pressable>
    </View>
  );
}
