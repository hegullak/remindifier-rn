import { Pressable, Text, View, type TextStyle } from "react-native";

export interface SectionLabelProps {
  children: string;
  style?: TextStyle;
  drag?: () => void;
  /** Tighter vertical rhythm (e.g. person detail). */
  compact?: boolean;
  /** Bottom border under the section title only (not per list row). */
  divider?: boolean;
}

export function SectionLabel({ children, style, drag, compact, divider }: SectionLabelProps) {
  return (
    <View
      className={`flex-row items-center justify-between ${
        compact ? "mt-3 mb-2" : "mt-5 mb-2"
      } ${divider ? "pb-2 border-b border-border" : ""}`}
    >
      <Text
        className="text-3xs uppercase tracking-[1.92px] text-text3 font-bodySemi"
        style={style}
      >
        {children}
      </Text>
      {drag ? (
        <Pressable
          onLongPress={drag}
          delayLongPress={120}
          hitSlop={12}
          accessibilityLabel="Hold to reorder"
        >
          <Text className="text-base text-text3 font-body leading-[16px]">≡</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
