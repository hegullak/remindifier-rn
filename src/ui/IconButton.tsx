import type { ReactNode } from "react";
import { Pressable, type PressableProps, useColorScheme } from "react-native";

export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  disabled,
  hitSlop = 6,
}: {
  children: ReactNode;
  onPress: PressableProps["onPress"];
  accessibilityLabel: string;
  disabled?: boolean;
  hitSlop?: number;
}) {
  const colorScheme = useColorScheme();
  const borderColor = colorScheme === "dark" ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.07)";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="w-[34px] h-[34px] rounded-md items-center justify-center bg-card2 opacity-100 active:opacity-70 disabled:opacity-40"
      style={{ borderWidth: 1, borderColor }}
    >
      {children}
    </Pressable>
  );
}
