import { Text, View } from "react-native";

const variantClass: Record<TagProps["variant"], { container: string; text: string }> = {
  amber: { container: "bg-amberLight", text: "text-amber" },
  green: { container: "bg-greenLight", text: "text-green" },
  blue: { container: "bg-blueLight", text: "text-blue" },
  dusk: { container: "bg-duskLight", text: "text-dusk" },
  red: { container: "bg-redLight", text: "text-red" },
};

export interface TagProps {
  variant: "amber" | "green" | "blue" | "dusk" | "red";
  children: string;
  className?: string;
}

export function Tag({ children, variant, className = "" }: TagProps) {
  const tone = variantClass[variant];
  return (
    <View className={`self-start px-3 py-1 rounded-[10px] ${tone.container} ${className}`}>
      <Text className={`text-xs ${tone.text} font-bodySemi`}>{children}</Text>
    </View>
  );
}
