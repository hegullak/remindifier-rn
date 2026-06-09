import { View } from "react-native";

type EchoflowMarkProps = {
  /** Total canvas size in px. */
  size?: number;
  /** Ring and dot color — slate accent by default. */
  color?: string;
};

/**
 * Concentric echo rings — echonote mark adapted for echoflow (vector, theme-tinted).
 */
export function EchoflowMark({ size = 24, color = "#7EB8D4" }: EchoflowMarkProps) {
  const stroke = Math.max(1.5, size * 0.09);
  const outer = size;
  const mid = size * 0.64;
  const inner = size * 0.38;
  const dot = size * 0.17;

  function ring(diameter: number) {
    return {
      position: "absolute" as const,
      width: diameter,
      height: diameter,
      borderRadius: diameter / 2,
      borderWidth: stroke,
      borderColor: color,
      backgroundColor: "transparent",
    };
  }

  return (
    <View
      style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={ring(outer)} />
      <View style={ring(mid)} />
      <View style={ring(inner)} />
      <View
        style={{
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: color,
        }}
      />
    </View>
  );
}
