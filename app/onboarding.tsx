import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import { Redirect, router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBootstrapApp } from "@/bootstrap/useBootstrapApp";
import migrations from "@/db/drizzle/migrations";
import { createPerson } from "@/db/repos/peopleRepo";
import { completeOnboarding, hasCompletedOnboarding } from "@/db/repos/userRepo";
import type * as schema from "@/db/schema";
import { useUserDrizzleDb } from "@/db/useUserDrizzleDb";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { EventNudgeSheet } from "@/features/people/EventNudgeSheet";
import { NaturalLanguageInputStep } from "@/features/people/NaturalLanguageInputStep";
import { draftToFormInitial } from "@/features/people/naturalIntake";
import { ParsedPersonPreviewCard } from "@/features/people/ParsedPersonPreviewCard";
import { PersonForm } from "@/features/people/PersonForm";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  type ParsedPersonDraft,
  parseNaturalPersonInput,
} from "@/lib/people/naturalLanguageParser";
import { FatalScreen, LoadingScreen } from "@/ui/StartupScreens";

type OnboardingStep = "input" | "preview";

function OnboardingContent({
  db,
  userId,
  getToken,
}: {
  db: ExpoSQLiteDatabase<typeof schema>;
  userId: string;
  getToken: () => Promise<string | null>;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const migrationState = useMigrations(db, migrations);
  const { ready } = useBootstrapApp(userId, migrationState.success);
  const [step, setStep] = useState<OnboardingStep>("input");
  const [naturalText, setNaturalText] = useState("");
  const [parsedDraft, setParsedDraft] = useState<ParsedPersonDraft | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState<boolean | null>(null);
  const [parsing, setParsing] = useState(false);
  const [nudge, setNudge] = useState<{ personId: string; personName: string; actions: string[] } | null>(null);

  useEffect(() => {
    if (!ready) return;
    hasCompletedOnboarding(userId)
      .then(setAlreadyCompleted)
      .catch(() => setAlreadyCompleted(false));
  }, [ready, userId]);

  if (migrationState.error) {
    return <FatalScreen message={migrationState.error.message} />;
  }

  if (!ready || alreadyCompleted === null) {
    return <LoadingScreen message={t("startup.preparingData")} />;
  }

  if (alreadyCompleted) {
    return <Redirect href="/(tabs)/brief" />;
  }

  async function finishOnboarding(personId?: string) {
    await completeOnboarding(userId);
    if (personId) {
      router.replace(`/(tabs)/people/${personId}`);
    } else {
      router.replace("/(tabs)/brief");
    }
  }

  async function handleContinue() {
    setParsing(true);
    try {
      const draft = await parseNaturalPersonInput(naturalText, { getToken });
      setParsedDraft(draft);
      setStep("preview");
    } finally {
      setParsing(false);
    }
  }

  return (
    <View
      className="flex-1 bg-bg"
      style={{
        flex: 1,
        backgroundColor: "#1A1E26",
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, flexGrow: 1 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {step === "input" ? (
          <>
            <Text className="text-[32px] leading-[38px] text-text1 font-heading">
              {t("onboarding.title")}
            </Text>
            <Text className="text-body-lg text-text2 font-body mt-3 mb-8">
              {t("onboarding.subtitle")}
            </Text>
            <NaturalLanguageInputStep
              value={naturalText}
              onChangeText={setNaturalText}
              onContinue={handleContinue}
              parsing={parsing}
            />
            <Pressable onPress={() => void finishOnboarding()} className="mt-10 py-3 items-center">
              <Text className="text-sm text-text3 font-body">{t("onboarding.skip")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-xs text-amber font-bodyMedium mb-3">
              {t("people.parsePreviewNotice")}
            </Text>
            {parsedDraft ? <ParsedPersonPreviewCard draft={parsedDraft} /> : null}
            <PersonForm
              key={parsedDraft?.rawInput ?? "onboarding"}
              initial={parsedDraft ? draftToFormInitial(parsedDraft) : undefined}
              submitLabel={t("people.createPerson")}
              onSubmit={async (payload) => {
                const personId = await createPerson(userId, payload);
                const actions = parsedDraft?.pendingActions ?? [];
                if (personId && actions.length > 0) {
                  setNudge({
                    personId,
                    personName: payload.displayName,
                    actions,
                  });
                } else {
                  await finishOnboarding(personId);
                }
              }}
            />
          </>
        )}
      </ScrollView>

      {nudge ? (
        <EventNudgeSheet
          visible={true}
          userId={userId}
          personId={nudge.personId}
          personName={nudge.personName}
          pendingActions={nudge.actions}
          onDismiss={() => void finishOnboarding(nudge.personId)}
          onCreated={() => void finishOnboarding(nudge.personId)}
        />
      ) : null}
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded, userId, getToken } = useAppAuth();
  const { db, loading, error } = useUserDrizzleDb(userId);

  if (!isLoaded) {
    return <LoadingScreen message={t("common.loading")} />;
  }

  if (!isSignedIn || !userId) {
    return <Redirect href="/sign-in" />;
  }

  if (error) {
    return <FatalScreen message={error.message} />;
  }

  if (loading || !db) {
    return <LoadingScreen message={t("startup.openingDatabase")} />;
  }

  return <OnboardingContent db={db} userId={userId} getToken={getToken} />;
}
