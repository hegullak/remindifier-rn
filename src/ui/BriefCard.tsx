import { View } from "react-native";

const stripeClass: Record<string, string> = {
  blue: "bg-text3",
  amber: "bg-amber",
};

export function BriefCard({
  children,
  stripeColor,
}: {
  children: React.ReactNode;
  stripeColor: "blue" | "amber";
}) {
  return (
    <View className="relative bg-card border border-black/10 rounded-lg px-4 py-3 mb-1 overflow-hidden">
      <View className={`absolute left-0 top-0 bottom-0 w-[3px] ${stripeClass[stripeColor]}`} />
      {children}
    </View>
  );
}
