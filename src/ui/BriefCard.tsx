import { View } from "react-native";

const stripeClass: Record<string, string> = {
  blue: "bg-blue",
  amber: "bg-amber",
  green: "bg-green",
  dusk: "bg-dusk",
  sage: "bg-sage",
};

export function BriefCard({
  children,
  stripeColor,
}: {
  children: React.ReactNode;
  stripeColor: "blue" | "amber" | "green" | "dusk" | "sage";
}) {
  return (
    <View className="relative bg-card border border-border rounded-lg px-4 py-3 mb-1 overflow-hidden">
      <View className={`absolute left-0 top-0 bottom-0 w-[3px] ${stripeClass[stripeColor]}`} />
      {children}
    </View>
  );
}
