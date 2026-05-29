import { useAppAuth } from "@/features/auth/useAppAuth";
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
}: {
  db: ExpoSQLiteDatabase<typeof schema>;
  userId: string;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const migrationState = useMigrations(db, migrations);
  const { ready } = useBootstrapApp(userId, migrationState.success);
  const [step, setStep] = useState<OnboardingStep>("input");
  const [naturalText, setNaturalText] = useState("");
  const [parsedDraft, setParsedDraft] = useState<ParsedPersonDraft | null>(null);
  const [alreadyCompleted, setAlreadyCompleted] = useState<boolean | null>(null);

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

  async function finishOnboarding() {
    await completeOnboarding(userId);
    router.replace("/(tabs)/brief");
  }

  function handleContinue() {
    const draft = parseNaturalPersonInput(naturalText);
    setParsedDraft(draft);
    setStep("preview");
  }

  return (
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
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
            <Text className="text-[15px] text-text2 font-body mt-3 mb-8">
              {t("onboarding.subtitle")}
            </Text>
            <NaturalLanguageInputStep
              value={naturalText}
              onChangeText={setNaturalText}
              onContinue={handleContinue}
            />
            <Pressable onPress={() => void finishOnboarding()} className="mt-10 py-3 items-center">
              <Text className="text-[14px] text-text3 font-body">{t("onboarding.skip")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text className="text-[12px] text-amber font-bodyMedium mb-3">
              {t("people.parsePreviewNotice")}
            </Text>
            {parsedDraft ? <ParsedPersonPreviewCard draft={parsedDraft} /> : null}
            <PersonForm
              key={parsedDraft?.rawInput ?? "onboarding"}
              initial={parsedDraft ? draftToFormInitial(parsedDraft) : undefined}
              submitLabel={t("people.createPerson")}
              onSubmit={async (payload) => {
                await createPerson(userId, payload);
                await finishOnboarding();
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { isSignedIn, isLoaded, userId } = useAppAuth();
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

  return <OnboardingContent db={db} userId={userId} />;
}
