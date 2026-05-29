import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { createPerson } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { NaturalLanguageInputStep } from "@/features/people/NaturalLanguageInputStep";
import { draftToFormInitial } from "@/features/people/naturalIntake";
import { ParsedPersonPreviewCard } from "@/features/people/ParsedPersonPreviewCard";
import { PersonForm } from "@/features/people/PersonForm";
import { useTranslation } from "@/i18n/LanguageContext";
import { qrPayloadToPersonPrefill } from "@/lib/me/qr-payload";
import {
  type ParsedPersonDraft,
  parseNaturalPersonInput,
} from "@/lib/people/naturalLanguageParser";
import { AppShell } from "@/ui/AppShell";

type IntakeMode = "natural" | "form";
type NaturalStep = "input" | "preview";

export default function NewPersonScreen() {
  const { userId } = useAppAuth();
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

  const [parsing, setParsing] = useState(false);

  async function handleNaturalContinue() {
    setParsing(true);
    try {
      const draft = await parseNaturalPersonInput(naturalText);
      setParsedDraft(draft);
      setNaturalStep("preview");
    } finally {
      setParsing(false);
    }
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
            <NaturalLanguageInputStep
              value={naturalText}
              onChangeText={setNaturalText}
              onContinue={handleNaturalContinue}
              parsing={parsing}
            />
          </View>
        ) : null}

        {showPreviewForm && intakeMode === "natural" && naturalStep === "preview" ? (
          <Text className="text-[12px] text-amber font-bodyMedium mb-3">
            {t("people.parsePreviewNotice")}
          </Text>
        ) : null}

        {showPreviewForm && parsedDraft && intakeMode === "natural" ? (
          <ParsedPersonPreviewCard draft={parsedDraft} />
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
