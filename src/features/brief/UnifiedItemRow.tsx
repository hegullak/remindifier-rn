import { Pressable, Text, View } from "react-native";
import type { UnifiedItem } from "@/features/brief/UnifiedItem";

/** Renders one list row — used by both Day and Week screens. */
export function UnifiedItemRow({
  item,
  isLast,
  showDayLabel,
  dimmed = false,
}: {
  item: UnifiedItem;
  isLast: boolean;
  showDayLabel: boolean;
  dimmed?: boolean;
}) {
  const row = (
    <View className={isLast ? "" : "mb-2.5"}>
      {showDayLabel && (
        <Text className="text-3xs uppercase tracking-[1.2px] text-sage font-bodySemi mb-1">
          {item.dayLabel}
        </Text>
      )}
      <View className="flex-row items-start gap-2">
        <Text className="text-base mt-0.5" style={dimmed ? { opacity: 0.45 } : undefined}>
          {item.icon}
        </Text>
        <View className="flex-1">
          <Text
            className="text-body-lg text-text1 font-bodyMedium"
            style={dimmed ? { opacity: 0.45, textDecorationLine: "line-through" } : undefined}
          >
            {item.primary}
          </Text>
          {item.secondary ? (
            <Text
              className="text-sm text-text2 font-body mt-0.5"
              style={dimmed ? { opacity: 0.45 } : undefined}
            >
              {item.secondary}
            </Text>
          ) : null}
          {item.note ? (
            <Text className="text-xs text-text3 font-body mt-0.5">{item.note}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  if (item.onPress) {
    return (
      <Pressable key={item.id} onPress={item.onPress} className="active:opacity-70">
        {row}
      </Pressable>
    );
  }
  return <View key={item.id}>{row}</View>;
}

/** Marks which items should show their day-label heading (first item of each day group). */
export function withDayLabels(
  items: UnifiedItem[],
  showDay: boolean,
): { item: UnifiedItem; showDayLabel: boolean }[] {
  return items.map((item, i) => ({
    item,
    showDayLabel: showDay && item.dayLabel !== (i > 0 ? items[i - 1].dayLabel : ""),
  }));
}
