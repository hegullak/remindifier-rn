import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n";

/**
 * Two-tier date navigation: day is the primary control (larger, bolder —
 * matches "Dagen min" below it), week is a quieter secondary row (smaller,
 * muted — matches "Uken min"). Same ‹ › glyph doubled for week (››) keeps
 * the icon language consistent instead of introducing a new symbol.
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
    <View className="mb-3">
      {/* Day — primary */}
      <View className="flex-row items-center justify-center gap-4">
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
          className="active:opacity-60 min-w-[120px] items-center"
        >
          <Text className="text-body-lg text-text1 font-bodySemi">{dayLabel}</Text>
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
      </View>

      {/* Week — secondary, quieter */}
      <View className="flex-row items-center justify-center gap-2 mt-0.5">
        <Pressable
          onPress={onPrevWeek}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("brief.weekPrev")}
          className="py-1 px-1 active:opacity-60"
        >
          <Text className="text-2xs text-text3 font-body">‹‹</Text>
        </Pressable>
        <Text className="text-2xs text-text3 font-bodySemi">{weekLabel}</Text>
        <Pressable
          onPress={onNextWeek}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("brief.weekNext")}
          className="py-1 px-1 active:opacity-60"
        >
          <Text className="text-2xs text-text3 font-body">››</Text>
        </Pressable>
      </View>
    </View>
  );
}
