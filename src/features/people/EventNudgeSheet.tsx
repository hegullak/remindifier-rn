import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { createGatheringWithTalkingPoints } from "@/db/repos/gatheringsRepo";
import { useTranslation } from "@/i18n/LanguageContext";
import { BottomSheet } from "@/ui/BottomSheet";

type Props = {
  visible: boolean;
  userId: string;
  personId: string;
  personName: string;
  pendingActions: string[];
  onDismiss: () => void;
  onCreated: (gatheringId: string) => void;
};

export function EventNudgeSheet({
  visible,
  userId,
  personId,
  personName,
  pendingActions,
  onDismiss,
  onCreated,
}: Props) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    try {
      const gatheringId = await createGatheringWithTalkingPoints(
        userId,
        personId,
        personName,
        pendingActions,
      );
      onCreated(gatheringId);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} title={t("eventNudge.title")}>
      <Text className="text-sm text-text2 font-body mb-4 leading-[21px]">
        {t("eventNudge.body", { name: personName })}
      </Text>

      <View className="bg-bg2 rounded-xl px-4 py-3 mb-5">
        {pendingActions.map((action) => (
          <Text key={action} className="text-body text-text1 font-body leading-[20px]">
            · {action}
          </Text>
        ))}
      </View>

      <View className="gap-2">
        <Pressable
          onPress={() => void handleCreate()}
          disabled={saving}
          className="bg-accent rounded-xl py-3 items-center"
        >
          {saving ? (
            <ActivityIndicator color="#F7F4EF" />
          ) : (
            <Text className="text-body-lg text-card font-bodySemi">{t("eventNudge.create")}</Text>
          )}
        </Pressable>
        <Pressable onPress={onDismiss} disabled={saving} className="py-3 items-center">
          <Text className="text-sm text-text3 font-body">{t("eventNudge.skip")}</Text>
        </Pressable>
      </View>
    </BottomSheet>
  );
}
