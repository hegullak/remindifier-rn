import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { View } from "react-native";

export type AppTheme = "sand" | "slate";

const STORAGE_KEY = "remindifier-theme";

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("slate");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === "sand" || stored === "slate") {
          setThemeState(stored);
        }
      })
      .finally(() => setReady(true));
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

  if (!ready) {
    return <View className="flex-1 bg-bg" />;
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, toggleTheme, isDark: theme === "slate" }}
    >
      <View className={`flex-1 bg-bg ${theme === "slate" ? "dark" : ""}`}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within ThemeProvider");
  return ctx;
}
