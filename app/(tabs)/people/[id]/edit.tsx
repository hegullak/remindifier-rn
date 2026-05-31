import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { triggerLight, triggerMedium } from "@/lib/haptics";
import { deletePerson, updatePerson } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { PersonForm, type PersonFormHandle } from "@/features/people/PersonForm";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { useTranslation } from "@/i18n/LanguageContext";
import type { RedLetterKind } from "@/lib/red-letter-day";
import { AppShell } from "@/ui/AppShell";

export default function EditPersonScreen() {
  const { userId } = useAppAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle, loading, error } = usePersonProfileData(userId, id);
  const formRef = useRef<PersonFormHandle>(null);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  return (
    <AppShell
      headerLeft={
        <Link href={id ? `/people/${id}` : "/people"} asChild>
          <Pressable
            onPress={() => { triggerLight(); Keyboard.dismiss(); }}
            hitSlop={12}
            accessibilityLabel="Back"
          >
            <Text className="text-xl text-accent font-body">←</Text>
          </Pressable>
        </Link>
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Text className="text-3xl leading-[36px] text-text1 font-heading mt-2">
            {t("people.editPersonTitle")}
          </Text>
        </View>

        {loading ? (
          <Text className="text-body text-text3 font-body">{t("common.loading")}</Text>
        ) : null}
        {error ? <Text className="text-body text-red font-body">{error}</Text> : null}
        {!loading && !error && !bundle ? (
          <Text className="text-body text-text3 font-body">{t("people.notFound")}</Text>
        ) : null}

        {bundle ? (
          <>
            <PersonForm
              ref={formRef}
              layout="cards"
              hideActions
              onSavingChange={setSaving}
              initial={{
                displayName: bundle.person.displayName,
                relationType: bundle.person.relationType,
                birthday: bundle.person.birthday,
                birthdayYearKnown: bundle.person.birthdayYearKnown,
                isSensitive: (bundle.person.sensitiveTopics ?? []).includes("handle_with_care"),
                funFacts: bundle.person.interests ?? [],
                redLetterDays: bundle.redLetterDays.map((d) => ({
                  id: d.id,
                  kind: d.kind as RedLetterKind,
                  label: d.label,
                  eventDate: d.eventDate,
                  yearKnown: d.yearKnown,
                  recurring: d.recurring,
                })),
              }}
              submitLabel={t("people.saveChanges")}
              onSubmit={async (payload) => {
                if (!userId || !id) throw new Error("Missing auth or person");
                await updatePerson(userId, id, payload);
                triggerMedium();
                Keyboard.dismiss();
                router.replace(`/people/${id}`);
              }}
              onDelete={async () => {
                if (!userId || !id) throw new Error("Missing auth or person");
                await deletePerson(userId, id);
                triggerMedium();
                Keyboard.dismiss();
                router.replace("/people");
              }}
            />

            <View className="gap-2 mt-2">
              <Pressable
                onPress={() => formRef.current?.submit()}
                disabled={saving}
                className="bg-accent rounded-lg py-3 px-4 items-center opacity-100 disabled:opacity-50"
              >
                <Text className="text-sm text-card font-bodySemi">
                  {saving ? t("personForm.saving") : t("people.saveChanges")}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => formRef.current?.delete()}
                disabled={saving}
                className="py-3 px-4 items-center opacity-100 disabled:opacity-50"
              >
                <Text className="text-body text-red font-bodyMedium">
                  {t("personForm.deletePerson")}
                </Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
