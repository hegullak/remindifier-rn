import { useAppAuth } from "@/features/auth/useAppAuth";
import { FlashList } from "@shopify/flash-list";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { PersonSummary } from "@/db/repos/peopleRepo";
import { usePeopleData } from "@/features/people/usePeopleData";
import { useTranslation } from "@/i18n/LanguageContext";
import { translateRelationType } from "@/i18n/relationTypes";
import { AppShell } from "@/ui/AppShell";
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

function formatLastSeen(
  date: Date | null,
  t: (path: string, params?: Record<string, string | number>) => string,
) {
  if (!date) return null;
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return t("people.lastSeenToday");
  if (days === 1) return t("people.lastSeenOneDay");
  if (days < 30) return t("people.lastSeenDays", { count: days });
  return t("people.lastSeenMonths", { count: Math.round(days / 30) });
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
  const lastSeen = formatLastSeen(person.lastInteractionAt, t);

  return (
    <Link href={`/people/${person.id}`} asChild>
      <Pressable>
        <Card style={{ marginBottom: 8 }}>
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-[18px] text-text1 font-heading">{person.displayName}</Text>
              {age ? <Text className="text-[12px] text-text3 font-body">{age}</Text> : null}
            </View>
            {person.relationType ? (
              <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-1">
                {translateRelationType(person.relationType, locale)}
              </Text>
            ) : null}
            {lastSeen ? (
              <Text className="text-[12px] text-text3 font-body mt-2">
                {t("people.lastContact", { when: lastSeen })}
              </Text>
            ) : null}
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function PeopleListScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const { people, loading, error } = usePeopleData(userId);
  const activePeople = people.filter((p) => !p.archived);

  const listHeader = (
    <View className="px-4">
      <View className="pt-1 pb-2 flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-[30px] leading-[36px] text-text1 font-heading">
            {t("people.title")}
          </Text>
          <Text className="text-[13px] text-text2 font-body mt-1">{t("people.subtitle")}</Text>
        </View>
        <Link href="/people/new" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("people.addPerson")}
            className="w-[34px] h-[34px] rounded-md items-center justify-center bg-card2 border border-border active:opacity-70"
          >
            <Text className="text-[22px] leading-[24px] text-accent font-bodyMedium">+</Text>
          </Pressable>
        </Link>
      </View>
      <SectionLabel>{t("people.listTitle")}</SectionLabel>
      {loading ? (
        <Text className="text-[13px] text-text3 font-body">{t("people.loadingPeople")}</Text>
      ) : null}
      {error ? <Text className="text-[13px] text-red font-body">{error}</Text> : null}
    </View>
  );

  const listEmpty =
    !loading && !error ? (
      <View className="px-4">
        <Text className="text-[13px] text-text3 font-body">{t("people.noPeople")}</Text>
      </View>
    ) : null;

  return (
    <AppShell>
      <FlashList
        data={loading || error ? [] : activePeople}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4">
            <PersonRowCard person={item} t={t} locale={locale} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </AppShell>
  );
}
