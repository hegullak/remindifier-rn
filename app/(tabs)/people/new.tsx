import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { createPerson } from "@/db/repos/peopleRepo";
import { PersonForm } from "@/features/people/PersonForm";
import { useTranslation } from "@/i18n/LanguageContext";
import { qrPayloadToPersonPrefill } from "@/lib/me/qr-payload";
import {
  type ParsedPersonDraft,
  parseNaturalPersonInput,
} from "@/lib/people/naturalLanguageParser";
import { AppShell } from "@/ui/AppShell";
import { Card } from "@/ui/Card";

type IntakeMode = "natural" | "form";
type NaturalStep = "input" | "preview";

function draftToFormInitial(draft: ParsedPersonDraft) {
  return {
    displayName: draft.displayName ?? "",
    relationType: draft.relationType,
    birthday: draft.birthday ?? "",
    birthdayYearKnown: draft.birthdayYearKnown,
    isSensitive: false,
    funFacts: draft.funFacts,
    redLetterDays: [],
  };
}

export default function NewPersonScreen() {
  const { userId } = useAuth();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    prefillName?: string;
    prefillBirthday?: string;
    prefillBirthdayYearKnown?: string;
    prefillAbout?: string;
    prefillContact?: string;
  }>();

  const scannedInitial = useMemo(() => {
    if (!params.prefillName?.trim()) return undefined;
    const prefill = qrPayloadToPersonPrefill({
      remindifier: 1,
      name: params.prefillName,
      birthday: params.prefillBirthday || undefined,
      birthdayYearKnown: params.prefillBirthdayYearKnown === "true",
      about: params.prefillAbout || undefined,
      contact: params.prefillContact || undefined,
    });
    return {
      ...prefill,
      isSensitive: false,
      redLetterDays: [],
    };
  }, [params]);

  const [intakeMode, setIntakeMode] = useState<IntakeMode>(scannedInitial ? "form" : "natural");
  const [naturalStep, setNaturalStep] = useState<NaturalStep>(scannedInitial ? "preview" : "input");
  const [naturalText, setNaturalText] = useState("");
  const [parsedDraft, setParsedDraft] = useState<ParsedPersonDraft | null>(null);

  const formInitial = useMemo(() => {
    if (scannedInitial) return scannedInitial;
    if (parsedDraft) return draftToFormInitial(parsedDraft);
    return undefined;
  }, [scannedInitial, parsedDraft]);

  const showPreviewForm =
    intakeMode === "form" || (intakeMode === "natural" && naturalStep === "preview");

  function handleNaturalContinue() {
    const draft = parseNaturalPersonInput(naturalText);
    setParsedDraft(draft);
    setNaturalStep("preview");
  }

  function switchMode(mode: IntakeMode) {
    setIntakeMode(mode);
    if (mode === "form") {
      setNaturalStep("input");
    }
  }

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Text className="text-[30px] leading-[36px] text-text1 font-heading">
            {t("people.newPersonTitle")}
          </Text>
          <Text className="text-[13px] text-text2 font-body mt-1">
            {scannedInitial ? t("people.newPersonFromQr") : t("people.newPersonSubtitle")}
          </Text>
        </View>

        {!scannedInitial ? (
          <View className="flex-row gap-2 mb-4">
            {(["natural", "form"] as const).map((mode) => {
              const active = intakeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => switchMode(mode)}
                  className={`flex-1 rounded-full py-2.5 px-3 border ${
                    active ? "bg-accent border-accent" : "bg-card2 border-border"
                  }`}
                >
                  <Text
                    className={`text-center text-[14px] font-bodySemi ${
                      active ? "text-card" : "text-text2"
                    }`}
                  >
                    {mode === "natural" ? t("people.naturalModeTab") : t("people.formModeTab")}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {intakeMode === "natural" && naturalStep === "input" && !scannedInitial ? (
          <View className="mb-4">
            <TextInput
              value={naturalText}
              onChangeText={setNaturalText}
              placeholder={t("people.naturalInputLabel")}
              placeholderTextColor="#7A8CAD"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              className="min-h-[160px] bg-bg2 border border-border rounded-xl px-4 py-3 text-[15px] text-text1 font-body"
            />
            <Pressable
              onPress={handleNaturalContinue}
              disabled={!naturalText.trim()}
              className="mt-3 min-h-[48px] rounded-xl bg-accent items-center justify-center opacity-100 disabled:opacity-50"
            >
              <Text className="text-[16px] text-card font-bodySemi">
                {t("people.naturalInputButton")}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {showPreviewForm && intakeMode === "natural" && naturalStep === "preview" ? (
          <Text className="text-[12px] text-amber font-bodyMedium mb-3">
            {t("people.parsePreviewNotice")}
          </Text>
        ) : null}

        {showPreviewForm && parsedDraft && intakeMode === "natural" ? (
          <Card style={{ marginBottom: 12, borderRadius: 18 }}>
            <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
              {t("people.parsedFrom")}
            </Text>
            <View className="mt-3 gap-2">
              {parsedDraft.displayName ? (
                <PreviewRow label={t("personForm.fullName")} value={parsedDraft.displayName} />
              ) : null}
              {parsedDraft.relationType ? (
                <PreviewRow label={t("personForm.relationType")} value={parsedDraft.relationType} />
              ) : null}
              {parsedDraft.birthday ? (
                <PreviewRow label={t("personForm.birthday")} value={parsedDraft.birthday} />
              ) : null}
              {parsedDraft.funFacts.length > 0 ? (
                <View>
                  <Text className="text-[11px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                    {t("personForm.funFacts")}
                  </Text>
                  {parsedDraft.funFacts.map((fact) => (
                    <Text key={fact} className="text-[14px] text-text2 font-body mt-1">
                      · {fact}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          </Card>
        ) : null}

        {showPreviewForm ? (
          <PersonForm
            key={
              scannedInitial
                ? `scan-${params.prefillName}`
                : `parsed-${parsedDraft?.rawInput ?? "form"}`
            }
            initial={formInitial}
            submitLabel={t("people.createPerson")}
            onSubmit={async (payload) => {
              if (!userId) throw new Error("Not signed in");
              const id = await createPerson(userId, payload);
              router.replace(`/people/${id}`);
            }}
          />
        ) : null}
      </ScrollView>
    </AppShell>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text className="text-[11px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
        {label}
      </Text>
      <Text className="text-[15px] text-text1 font-bodyMedium mt-0.5">{value}</Text>
    </View>
  );
}
