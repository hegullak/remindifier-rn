import { Text, View } from "react-native";

export function Tag({
  children,
  tone = "amber",
  className = "",
}: {
  children: string;
  tone?: "amber";
  className?: string;
}) {
  const toneClass = tone === "amber" ? "bg-amberLight" : "bg-amberLight";
  return (
    <View className={`self-start px-2.5 py-1 rounded-pill ${toneClass} ${className}`}>
      <Text className="text-[12px] text-amber font-heading">{children}</Text>
    </View>
  );
}
