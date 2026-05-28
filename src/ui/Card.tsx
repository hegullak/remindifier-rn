import { useColorScheme, View, type ViewStyle } from "react-native";

const stripeClass: Record<NonNullable<CardProps["stripe"]>, string> = {
  blue: "bg-blue",
  amber: "bg-amber",
  red: "bg-red",
  green: "bg-green",
  dusk: "bg-dusk",
  default: "bg-border",
};

export interface CardProps {
  stripe?: "blue" | "amber" | "red" | "green" | "dusk" | "default";
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, stripe, style }: CardProps) {
  const colorScheme = useColorScheme();

  return (
    <View
      className="relative bg-card rounded-lg px-4 py-3 mb-2 overflow-hidden"
      style={[
        {
          borderWidth: 1,
          borderColor: colorScheme === "dark" ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.07)",
        },
        style,
      ]}
    >
      {stripe ? (
        <View className={`absolute left-0 top-0 bottom-0 w-[3px] ${stripeClass[stripe]}`} />
      ) : null}
      {children}
    </View>
  );
}
