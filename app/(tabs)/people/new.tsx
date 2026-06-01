import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { triggerLight, triggerMedium } from "@/lib/haptics";
import { createPerson } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { EventNudgeSheet } from "@/features/people/EventNudgeSheet";
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
  const { userId, getToken } = useAppAuth();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    prefillName?: string;
    prefillBirthday?: string;
    prefillBirthdayYearKnown?: string;
    prefillAbout?: string;
    prefillContact?: string;
    returnTo?: string;
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
  const [nudge, setNudge] = useState<{ personId: string; personName: string; actions: string[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  async function handleNaturalContinue() {
    setParsing(true);
    try {
      const draft = await parseNaturalPersonInput(naturalText, { getToken });
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
    <AppShell
      headerLeft={
        <Pressable
          onPress={() => { triggerLight(); Keyboard.dismiss(); router.back(); }}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Text className="text-xl text-accent font-body">←</Text>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Text className="text-3xl leading-[36px] text-text1 font-heading">
            {t("people.newPersonTitle")}
          </Text>
          <Text className="text-body text-text2 font-body mt-1">
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
                    className={`text-center text-sm font-bodySemi ${
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
          <Text className="text-xs text-amber font-bodyMedium mb-3">
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
              const personId = await createPerson(userId, payload);
              triggerMedium();
              Keyboard.dismiss();
              const actions = parsedDraft?.pendingActions ?? [];
              if (personId && actions.length > 0) {
                setNudge({ personId, personName: payload.displayName, actions });
              } else if (personId) {
                const destination = params.returnTo ?? `/people/${personId}`;
                router.replace(destination);
              }
            }}
          />
        ) : null}
      </ScrollView>

      {nudge && userId ? (
        <EventNudgeSheet
          visible={true}
          userId={userId}
          personId={nudge.personId}
          personName={nudge.personName}
          pendingActions={nudge.actions}
          onDismiss={() => {
            const destination = params.returnTo ?? `/people/${nudge.personId}`;
            router.replace(destination);
          }}
          onCreated={(gatheringId) => {
            const destination = params.returnTo ?? `/gather/${gatheringId}`;
            router.replace(destination);
          }}
        />
      ) : null}
    </AppShell>
  );
}
