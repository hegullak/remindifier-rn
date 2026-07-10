import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "@/i18n";
import { triggerLight } from "@/lib/haptics";
import { LOOK_FORWARD_MAX_LENGTH } from "@/lib/brief/lookForward";
import { BriefCard } from "@/ui/BriefCard";

type LookForwardPromptProps = {
  onSave: (text: string) => Promise<void>;
  onDismiss: () => Promise<void>;
  /** Pre-fill when editing an existing line. */
  initialText?: string;
};

export function LookForwardPrompt({ onSave, onDismiss, initialText = "" }: LookForwardPromptProps) {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const isEditing = initialText.trim().length > 0;

  const canSave = text.trim().length > 0 && !busy;

  const handleSave = useCallback(async () => {
    if (!canSave) return;
    triggerLight();
    setBusy(true);
    try {
      await onSave(text.trim());
    } finally {
      setBusy(false);
    }
  }, [canSave, onSave, text]);

  const handleDismiss = useCallback(async () => {
    if (busy) return;
    triggerLight();
    setBusy(true);
    try {
      await onDismiss();
    } finally {
      setBusy(false);
    }
  }, [busy, onDismiss]);

  return (
    <View className="mb-4">
      <BriefCard stripeColor="amber">
        <Text className="text-body-lg text-text1 font-bodyMedium leading-[22px] mb-3">
          {t("brief.lookForward.prompt")}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("brief.lookForward.placeholder")}
          placeholderTextColor="#7A8CAD"
          maxLength={LOOK_FORWARD_MAX_LENGTH}
          multiline
          editable={!busy}
          className="text-body-lg text-text1 font-body bg-bg2 border border-border rounded-md px-3 py-2.5 min-h-[44px]"
          style={{ textAlignVertical: "top" }}
        />
        <View className="flex-row items-center justify-between mt-3 gap-3">
          <Pressable
            onPress={() => void handleDismiss()}
            disabled={busy}
            className="py-2 active:opacity-70"
            accessibilityRole="button"
          >
            <Text className="text-body text-text3 font-bodyMedium">
              {isEditing ? t("brief.lookForward.cancel") : t("brief.lookForward.skip")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleSave()}
            disabled={!canSave}
            className={`px-4 py-2 rounded-md bg-accent active:opacity-80 ${canSave ? "" : "opacity-40"}`}
            accessibilityRole="button"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#1A1E26" />
            ) : (
              <Text className="text-body text-bg font-bodySemi">{t("brief.lookForward.save")}</Text>
            )}
          </Pressable>
        </View>
      </BriefCard>
    </View>
  );
}
