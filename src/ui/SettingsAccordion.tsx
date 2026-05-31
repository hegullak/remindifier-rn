import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Card } from "@/ui/Card";

export function SettingsAccordion({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card style={{ marginTop: 8, paddingVertical: 0, overflow: "hidden" }}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        className="flex-row items-center justify-between py-4 px-4"
      >
        <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi flex-1 pr-3">
          {title}
        </Text>
        <Text className="text-sm text-text3 font-body">{expanded ? "−" : "+"}</Text>
      </Pressable>
      {expanded ? <View className="px-4 pb-4 border-t border-border">{children}</View> : null}
    </Card>
  );
}
