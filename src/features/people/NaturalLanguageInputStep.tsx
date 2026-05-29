import { Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "@/i18n/LanguageContext";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onContinue: () => void;
};

export function NaturalLanguageInputStep({ value, onChangeText, onContinue }: Props) {
  const { t } = useTranslation();

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t("people.naturalInputPlaceholder")}
        placeholderTextColor="#7A8CAD"
        multiline
        numberOfLines={6}
        textAlignVertical="top"
        className="min-h-[160px] bg-bg2 border border-border rounded-xl px-4 py-3 text-[15px] text-text1 font-body"
      />
      <Pressable
        onPress={() => { Keyboard.dismiss(); onContinue(); }}
        disabled={!value.trim()}
        className="mt-3 min-h-[48px] rounded-xl bg-accent items-center justify-center opacity-100 disabled:opacity-50"
      >
        <Text className="text-[16px] text-card font-bodySemi">
          {t("people.naturalInputButton")}
        </Text>
      </Pressable>
    </View>
  );
}
