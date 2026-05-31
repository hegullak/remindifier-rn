import { Pressable, Text } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={theme === "slate" ? "Switch to light theme" : "Switch to dark theme"}
      className="min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-card2 border border-border"
    >
      <Text className="text-lg">{theme === "slate" ? "☀️" : "🌙"}</Text>
    </Pressable>
  );
}
