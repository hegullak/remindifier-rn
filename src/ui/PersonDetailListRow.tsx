import type { ReactNode } from "react";
import { Text, View } from "react-native";

/** Flat list row matching gather event-detail talking points. */
export function PersonDetailListRow({
  icon,
  children,
}: {
  icon?: string;
  children: ReactNode;
}) {
  return (
    <View className="flex-row items-start gap-3 py-2.5 border-b border-border bg-bg">
      {icon ? (
        <Text className="text-base mt-0.5 shrink-0" accessibilityElementsHidden>
          {icon}
        </Text>
      ) : null}
      <View className="flex-1 min-w-0">{children}</View>
    </View>
  );
}
