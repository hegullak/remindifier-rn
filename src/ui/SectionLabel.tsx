import { Pressable, Text, View, type TextStyle } from "react-native";

export interface SectionLabelProps {
  children: string;
  style?: TextStyle;
  drag?: () => void;
}

export function SectionLabel({ children, style, drag }: SectionLabelProps) {
  return (
    <View className="flex-row items-center justify-between mt-5 mb-2">
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
