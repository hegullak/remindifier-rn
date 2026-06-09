import type { AppTheme } from "@/theme/ThemeProvider";

/** NativeWind token classes on the root (`dark` + optional `guitar` override in global.css). */
export function themeClassFor(theme: AppTheme): string {
  if (theme === "sand") return "";
  if (theme === "guitar") return "dark guitar";
  return "dark";
}
