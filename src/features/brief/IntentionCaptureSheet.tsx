import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { addIntention } from "@/db/repos/intentionsRepo";
import { useTranslation } from "@/i18n";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { localDateKey } from "@/lib/brief/lookForward";
import { logger } from "@/lib/logger";
import { useAppTheme } from "@/theme/ThemeProvider";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";

type Horizon = "today" | "week" | "month";
const HORIZONS: Horizon[] = ["today", "week", "month"];

function dueByForHorizon(horizon: Horizon): string {
  const now = new Date();
  if (horizon === "today") return localDateKey(now);
  if (horizon === "week") return localDateKey(getCalendarWeekBounds().end);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return localDateKey(endOfMonth);
}

/**
 * The real capture side of the companion loop — no NLP, just a text field
 * and a rough horizon. echoflow decides *when* to surface it (see
 * intentionWeave.ts); the user only says *what* and *how soon*.
 */
export function IntentionCaptureSheet({
  visible,
  onDismiss,
  userId,
}: {
  visible: boolean;
  onDismiss: () => void;
  userId: string | null | undefined;
}) {
  const { t } = useTranslation();
  const { isDark } = useAppTheme();
  const [text, setText] = useState("");
  const [horizon, setHorizon] = useState<Horizon>("week");
  const [saving, setSaving] = useState(false);

  function reset() {
    setText("");
    setHorizon("week");
  }

  async function handleSave() {
    if (!userId || !text.trim()) return;
    setSaving(true);
    try {
      await addIntention(userId, { text: text.trim(), dueBy: dueByForHorizon(horizon) });
      notifyBriefReload();
      reset();
      onDismiss();
    } catch (error) {
      logger.error("intention_capture_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      visible={visible}
      onDismiss={() => {
        reset();
        onDismiss();
      }}
      title={t("intentions.captureTitle")}
    >
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("intentions.placeholder")}
        placeholderTextColor={isDark ? "#7A8CAD" : "#A89E90"}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        style={[
          styles.input,
          {
            color: isDark ? "#EEF0F5" : "#1C1915",
            backgroundColor: isDark ? "#222838" : "#EFECE3",
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
          },
        ]}
      />

      <View className="flex-row gap-2 mt-3 mb-5">
        {HORIZONS.map((h) => (
          <Pressable
            key={h}
            onPress={() => setHorizon(h)}
            className={`flex-1 py-2 rounded-pill border items-center ${
              horizon === h ? "border-accent bg-accentLight" : "border-border"
            }`}
          >
            <Text
              className={`text-2xs uppercase tracking-[1px] font-bodySemi ${
                horizon === h ? "text-accent" : "text-text3"
              }`}
            >
              {t(`intentions.horizon.${h}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button onPress={handleSave} loading={saving} disabled={saving || !text.trim()}>
        {t("common.save")}
      </Button>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
});
