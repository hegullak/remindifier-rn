import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { themeClassFor } from "@/theme/themeClass";

export type AppTheme = "sand" | "slate" | "guitar";

const STORAGE_KEY = "remindifier-theme";

const THEME_BG: Record<AppTheme, string> = {
  slate: "#1A1E26",
  sand: "#D7D3CA",
  guitar: "#0e0c0a",
};

function isStoredTheme(value: string | null): value is AppTheme {
  return value === "sand" || value === "slate" || value === "guitar";
}

type ThemeContextValue = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  toggleGuitarTheme: () => void;
  isDark: boolean;
  /** NativeWind class for CSS token set (`dark`, or `dark guitar`). */
  themeClass: string;
  /** Resolved background color for the active theme. */
  bg: string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("slate");
  const previousNonGuitar = useRef<"sand" | "slate">("slate");

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (isStoredTheme(stored)) {
          setThemeState(stored);
        }
      })
      .catch(() => {
        // keep default slate
      });
  }, []);

  const persistTheme = useCallback((next: AppTheme) => {
    SecureStore.setItemAsync(STORAGE_KEY, next).catch(() => {
      // no-op
    });
  }, []);

  const setTheme = useCallback(
    (next: AppTheme) => {
      setThemeState(next);
      persistTheme(next);
    },
    [persistTheme],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === "sand" ? "slate" : "sand");
  }, [setTheme, theme]);

  const toggleGuitarTheme = useCallback(() => {
    setThemeState((current) => {
      const next =
        current === "guitar"
          ? previousNonGuitar.current
          : (() => {
              previousNonGuitar.current = current === "sand" ? "sand" : "slate";
              return "guitar" as const;
            })();
      persistTheme(next);
      return next;
    });
  }, [persistTheme]);

  const themeClass = themeClassFor(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        toggleGuitarTheme,
        isDark: theme !== "sand",
        themeClass,
        bg: THEME_BG[theme],
      }}
    >
      <View
        style={{ flex: 1, backgroundColor: THEME_BG[theme] }}
        className={`flex-1 bg-bg ${themeClass}`.trim()}
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
