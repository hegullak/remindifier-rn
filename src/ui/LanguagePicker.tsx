import { Pressable, Text, View } from "react-native";
import { useLanguage } from "@/i18n";
import type { Locale } from "@/i18n/types";

const FLAGS: { locale: Locale; flag: string; labelKey: string }[] = [
  { locale: "no", flag: "🇳🇴", labelKey: "language.switchToNo" },
  { locale: "en", flag: "🇬🇧", labelKey: "language.switchToEn" },
];

export function LanguagePicker() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <View className="flex-row items-center gap-1">
      {FLAGS.map(({ locale: code, flag, labelKey }) => {
        const active = locale === code;
        return (
          <Pressable
            key={code}
            onPress={() => setLocale(code)}
            accessibilityRole="button"
            accessibilityLabel={t(labelKey)}
            accessibilityState={{ selected: active }}
            className={`w-9 h-9 rounded-md items-center justify-center ${active ? "bg-bg2" : "opacity-45"}`}
          >
            <Text className="text-xl leading-[24px]">{flag}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
