import { View } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { BRIEF_STRIPE_COLORS, type BriefStripeColor } from "@/theme/tokens";

export function BriefCard({
  children,
  stripeColor,
}: {
  children: React.ReactNode;
  stripeColor: BriefStripeColor;
}) {
  const { theme } = useAppTheme();
  const stripeHex = BRIEF_STRIPE_COLORS[theme][stripeColor];

  return (
    <View className="relative bg-card border border-border rounded-lg px-4 py-2.5 mb-1 overflow-hidden">
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: stripeHex,
        }}
      />
      {children}
    </View>
  );
}
