import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { View } from "react-native";

export type AppTheme = "sand" | "slate";

const STORAGE_KEY = "remindifier-theme";

const THEME_BG: Record<AppTheme, string> = {
  slate: "#1A1E26",
  sand: "#E7EAF0",
};

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  /** Resolved background color for the active theme. */
  bg: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("slate");

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === "sand" || stored === "slate") {
          setThemeState(stored);
        }
      })
      .catch(() => {
        // keep default slate
      });
  }, []);

  const setTheme = useCallback((next: AppTheme) => {
    setThemeState(next);
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {
      // no-op
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "slate" ? "sand" : "slate");
  }, [setTheme, theme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, isDark: theme === "slate", bg: THEME_BG[theme] }}
    >
      <View
        style={{ flex: 1, backgroundColor: THEME_BG[theme] }}
        className={`flex-1 bg-bg ${theme === "slate" ? "dark" : ""}`}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
