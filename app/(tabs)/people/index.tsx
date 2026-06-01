import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { deletePerson, type PersonSummary } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { usePeopleData } from "@/features/people/usePeopleData";
import { useTranslation } from "@/i18n/LanguageContext";
import { translateRelationType } from "@/i18n/relationTypes";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import { buildPersonRelevanceHint } from "@/lib/people/relevanceHint";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { SectionLabel } from "@/ui/SectionLabel";

function formatAge(
  birthday: string | null,
  yearKnown: boolean,
  t: (path: string, params?: Record<string, string | number>) => string,
) {
  if (!birthday || !yearKnown) return null;
  const birthYear = Number(birthday.slice(0, 4));
  if (!birthYear || birthYear < 1900) return null;
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const month = Number(birthday.slice(5, 7)) - 1;
  const day = Number(birthday.slice(8, 10));
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age--;
  if (age < 0) return null;
  return t("people.years", { count: age });
}

function PersonRowCard({
  person,
  t,
  locale,
}: {
  person: PersonSummary;
  t: (path: string, params?: Record<string, string | number>) => string;
  locale: "en" | "no";
}) {
  const age = formatAge(person.birthday, person.birthdayYearKnown, t);
  const hint = buildPersonRelevanceHint(
    {
      nextRedLetterDayLabel: person.nextRedLetterDayLabel,
      nextRedLetterDaysUntil: person.nextRedLetterDaysUntil,
      nextGatheringTitle: person.nextGatheringTitle,
      nextGatheringDaysUntil: person.nextGatheringDaysUntil,
      firstFollowUpBody: person.firstFollowUpBody,
    },
    locale,
  );

  return (
    <Card style={{ marginBottom: 0 }}>
      <Link href={`/people/${person.id}`} asChild>
        <Pressable>
          <View className="flex-row items-center gap-2">
            <Text className="text-xl text-text1 font-heading">{person.displayName}</Text>
            {age ? <Text className="text-sm text-text3 font-body">{age}</Text> : null}
          </View>
          {person.relationType ? (
            <Text className="text-2xs uppercase tracking-[1.5px] text-text3 font-bodySemi mt-1">
              {translateRelationType(person.relationType, locale)}
            </Text>
          ) : null}
          {hint ? <Text className="text-body-lg text-text2 font-body mt-2">{hint}</Text> : null}
        </Pressable>
      </Link>
    </Card>
  );
}

export default function PeopleListScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const { people, loading, error, reload } = usePeopleData(userId);
  const activePeople = people.filter((p) => !p.archived);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reload();
      return () => {
        Keyboard.dismiss();
      };
    }, [reload]),
  );

  async function handleDelete() {
    if (!userId || !deleteId) return;
    setDeleting(true);
    try {
      await deletePerson(userId, deleteId);
      triggerMedium();
      setDeleteId(null);
      await reload();
    } finally {
      setDeleting(false);
    }
  }

  const deleteName = activePeople.find((p) => p.id === deleteId)?.displayName ?? "";

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View className="px-4">
          <View className="pt-1 pb-2">
            <Text className="text-3xl leading-[36px] text-text1 font-heading">
              {t("people.title")}
            </Text>
            <Text className="text-body text-text2 font-body mt-1">{t("people.subtitle")}</Text>
          </View>
          <SectionLabel>{t("people.listTitle")}</SectionLabel>
          {loading ? (
            <Text className="text-body text-text3 font-body">{t("people.loadingPeople")}</Text>
          ) : null}
          {error ? <Text className="text-body text-red font-body">{error}</Text> : null}
          {!loading && !error && activePeople.length === 0 ? (
            <Text className="text-body text-text3 font-body">{t("people.noPeople")}</Text>
          ) : null}
        </View>

        <View className="px-4">
          {activePeople.map((person) => (
            <View key={person.id} style={{ borderRadius: 20, overflow: "hidden", marginBottom: 8 }}>
              <Swipeable
                friction={1.5}
                overshootRight={false}
                rightThreshold={40}
                renderRightActions={() => (
                  <View className="flex-row">
                    <Pressable
                      onPress={() => { triggerSelection(); router.push(`/people/${person.id}/edit`); }}
                      className="bg-amber items-center justify-center px-5"
                    >
                      <Text className="text-xl" style={{ color: "#fff" }}>✎</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => { triggerLight(); setDeleteId(person.id); }}
                      className="bg-red items-center justify-center px-5"
                    >
                      <Text className="text-xl" style={{ color: "#fff" }}>🗑</Text>
                    </Pressable>
                  </View>
                )}
              >
                <View>
                  <PersonRowCard person={person} t={t} locale={locale} />
                </View>
              </Swipeable>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet
        visible={deleteId !== null}
        onDismiss={() => setDeleteId(null)}
        title={t("people.deletePersonTitle")}
      >
        <Text className="text-sm text-text2 font-body mb-4">
          {t("people.deletePersonBody", { name: deleteName || t("people.deletePersonFallback") })}
        </Text>
        <View className="gap-2">
          <Button variant="primary" onPress={() => void handleDelete()} loading={deleting} disabled={deleting}>
            {t("people.deletePersonButton")}
          </Button>
          <Button variant="ghost" onPress={() => setDeleteId(null)} disabled={deleting}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>
    </AppShell>
  );
}
