import { Pressable, Text } from "react-native";

const variantClass: Record<
  NonNullable<ButtonProps["variant"]>,
  { container: string; text: string }
> = {
  primary: {
    container: "bg-accent",
    text: "text-card",
  },
  secondary: {
    container: "bg-card border border-border",
    text: "text-text1",
  },
  ghost: {
    container: "bg-transparent",
    text: "text-accent",
  },
};

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  onPress: () => void;
  children: string;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  onPress,
  children,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const styles = variantClass[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-lg py-3 px-4 items-center justify-center ${styles.container} ${
        isDisabled ? "opacity-50" : ""
      }`}
      style={({ pressed }) => (pressed && !isDisabled ? { opacity: 0.85 } : undefined)}
    >
      <Text className={`text-[14px] font-bodySemi ${styles.text}`}>
        {loading ? "…" : children}
      </Text>
    </Pressable>
  );
}
