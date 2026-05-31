import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { addToIntakeInbox } from "@/db/repos/intakeInboxRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import {
  SemanticIntakePreviewCard,
  valuesFromParse,
} from "@/features/intake/SemanticIntakePreviewCard";
import { useTranslation } from "@/i18n";
import { triggerLight, triggerMedium } from "@/lib/haptics";
import { confirmSemanticIntake } from "@/lib/intake/confirmSemanticIntake";
import { applySemanticIntakeEdits, parseSemanticIntake } from "@/lib/intake/semanticIntakeParser";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";
import { AppShell } from "@/ui/AppShell";
import { Button } from "@/ui/Button";

type Step = "input" | "preview";

export default function SemanticIntakeScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const colorScheme = useColorScheme();
  const placeholderColor = colorScheme === "dark" ? "#7A8CAD" : "#A89E90";
  const inputTextColor = colorScheme === "dark" ? "#E8E4DC" : "#1C1915";

  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [parsed, setParsed] = useState<SemanticIntakeParseResult | null>(null);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(
    valuesFromParse({
      rawText: "",
      fields: [],
      ambiguities: [],
      overallConfidence: "low",
      person: null,
      event: null,
      scheduledAt: null,
      followUps: [],
      freeFormNote: null,
    }),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParse = useCallback(() => {
    Keyboard.dismiss();
    const result = parseSemanticIntake(inputText, { locale: locale === "no" ? "no" : "en" });
    setParsed(result);
    setValues(valuesFromParse(result));
    setEditing(false);
    setError(null);
    setStep("preview");
    triggerLight();
  }, [inputText, locale]);

  function currentParsed(): SemanticIntakeParseResult | null {
    if (!parsed) return null;
    return applySemanticIntakeEdits(parsed, {
      eventTitle: values.eventTitle,
      personName: values.personName,
      scheduledLabel: values.scheduledLabel,
      followUpText: values.followUpText,
    });
  }

  async function handleConfirm() {
    if (!userId) return;
    const draft = currentParsed();
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const result = await confirmSemanticIntake(userId, draft);
      triggerMedium();
      if (result.kind === "gathering") {
        router.replace(`/gather/${result.gatheringId}`);
        return;
      }
      if (result.kind === "follow_up") {
        router.replace(`/people/${result.personId}`);
        return;
      }
    } catch {
      if (draft.freeFormNote || (!draft.event && draft.followUps.length === 0)) {
        try {
          await addToIntakeInbox(userId, { rawText: draft.rawText, parsed: draft });
          triggerMedium();
          router.back();
          return;
        } catch {
          setError(t("intake.inboxFailed"));
          return;
        }
      }
      setError(t("intake.confirmFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendToInbox() {
    if (!userId) return;
    const draft = currentParsed();
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      await addToIntakeInbox(userId, { rawText: draft.rawText, parsed: draft });
      triggerMedium();
      router.back();
    } catch {
      setError(t("intake.inboxFailed"));
    } finally {
      setBusy(false);
    }
  }

  function handleEditToggle() {
    if (editing) {
      setEditing(false);
      triggerLight();
      return;
    }
    setEditing(true);
    triggerLight();
  }

  return (
    <AppShell showAddButton={false}>
      <ScrollView
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} className="self-start mb-3">
          <Text className="text-xl text-accent font-body">←</Text>
        </Pressable>

        <Text className="text-[28px] leading-[34px] text-text1 font-heading mb-1">
          {t("intake.title")}
        </Text>
        <Text className="text-sm text-text2 font-body mb-4">{t("intake.subtitle")}</Text>

        {step === "input" ? (
          <View>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={t("intake.placeholder")}
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{ color: inputTextColor }}
              className="min-h-[160px] bg-bg2 border border-border rounded-xl px-4 py-3 text-body-lg text-text1 font-body"
            />
            <Text className="text-xs text-text3 font-body mt-2">
              {t("intake.dictationHint")}
            </Text>
            <Pressable
              onPress={handleParse}
              disabled={!inputText.trim()}
              className="mt-4 min-h-[48px] rounded-xl bg-accent items-center justify-center disabled:opacity-50"
            >
              <Text className="text-base text-card font-bodySemi">{t("intake.continue")}</Text>
            </Pressable>
          </View>
        ) : null}

        {step === "preview" && parsed ? (
          <View className="gap-3">
            <SemanticIntakePreviewCard
              parsed={currentParsed() ?? parsed}
              editing={editing}
              values={values}
              onChange={setValues}
            />

            {error ? <Text className="text-body text-red font-body">{error}</Text> : null}

            <View className="gap-2">
              <Button
                variant="primary"
                onPress={() => void handleConfirm()}
                loading={busy}
                disabled={busy}
              >
                {t("intake.confirm")}
              </Button>
              <Button variant="secondary" onPress={handleEditToggle} disabled={busy}>
                {editing ? t("intake.doneEditing") : t("intake.edit")}
              </Button>
              <Button
                variant="ghost"
                onPress={() => void handleSendToInbox()}
                loading={busy}
                disabled={busy}
              >
                {t("intake.sendToInbox")}
              </Button>
              <Button
                variant="ghost"
                onPress={() => {
                  setStep("input");
                  setEditing(false);
                  triggerLight();
                }}
                disabled={busy}
              >
                {t("intake.backToInput")}
              </Button>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
