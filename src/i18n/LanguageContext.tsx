import * as SecureStore from "expo-secure-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { translate } from "./translate";
import { DEFAULT_LOCALE, isLocale, LOCALE_STORAGE_KEY, type Locale } from "./types";

type TFunction = (path: string, params?: Record<string, string | number>) => string;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_STORAGE_KEY).then((stored) => {
      if (isLocale(stored)) setLocaleState(stored);
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    void SecureStore.setItemAsync(LOCALE_STORAGE_KEY, next);
  }, []);

  const t = useCallback<TFunction>((path, params) => translate(locale, path, params), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

export function useTranslation() {
  const { t, locale } = useLanguage();
  return { t, locale };
}
