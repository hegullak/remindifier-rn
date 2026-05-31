import { useEffect, useState } from "react";
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from "react-native";
import { NaturalLanguagePrivacyNotice } from "@/features/people/NaturalLanguagePrivacyNotice";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  hasSeenNaturalLanguagePrivacy,
  markNaturalLanguagePrivacySeen,
} from "@/lib/people/naturalLanguageParser.privacy";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onContinue: () => void | Promise<void>;
  parsing?: boolean;
};

export function NaturalLanguageInputStep({
  value,
  onChangeText,
  onContinue,
  parsing = false,
}: Props) {
  const { t } = useTranslation();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyReady, setPrivacyReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    hasSeenNaturalLanguagePrivacy()
      .then((seen) => {
        if (!cancelled) {
          setShowPrivacy(!seen);
          setPrivacyReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShowPrivacy(true);
          setPrivacyReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDismissPrivacy() {
    await markNaturalLanguagePrivacySeen();
    setShowPrivacy(false);
  }

  async function handleContinue() {
    Keyboard.dismiss();
    if (showPrivacy) {
      await markNaturalLanguagePrivacySeen();
      setShowPrivacy(false);
    }
    await onContinue();
  }

  const apiConfigured = Boolean(process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY?.trim());

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
        className="min-h-[160px] bg-bg2 border border-border rounded-xl px-4 py-3 text-body-lg text-text1 font-body"
      />
      {apiConfigured && privacyReady && showPrivacy ? (
        <NaturalLanguagePrivacyNotice onDismiss={() => void handleDismissPrivacy()} />
      ) : null}
      <Pressable
        onPress={() => void handleContinue()}
        disabled={!value.trim() || parsing}
        className="mt-3 min-h-[48px] rounded-xl bg-accent items-center justify-center opacity-100 disabled:opacity-50"
      >
        {parsing ? (
          <ActivityIndicator color="#F7F4EF" />
        ) : (
          <Text className="text-base text-card font-bodySemi">
            {t("people.naturalInputButton")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
