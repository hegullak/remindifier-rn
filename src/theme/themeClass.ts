import type { AppTheme } from "@/theme/ThemeProvider";

/** NativeWind token class on the root (`dark` for all dark themes; guitar colors via `vars()`). */
export function themeClassFor(theme: AppTheme): string {
  if (theme === "sand") return "";
  return "dark";
}
