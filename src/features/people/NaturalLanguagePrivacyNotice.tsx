import { Pressable, Text, View } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";

type Props = {
  onDismiss: () => void;
};

export function NaturalLanguagePrivacyNotice({ onDismiss }: Props) {
  const { t } = useTranslation();

  return (
    <View className="mb-3 rounded-xl border border-border bg-card px-4 py-3">
      <Text className="text-body leading-5 text-text2 font-body">
        {t("people.naturalInputPrivacy")}
      </Text>
      <Pressable onPress={onDismiss} className="mt-2 self-start">
        <Text className="text-body text-accent font-bodySemi">
          {t("people.naturalInputPrivacyOk")}
        </Text>
      </Pressable>
    </View>
  );
}
