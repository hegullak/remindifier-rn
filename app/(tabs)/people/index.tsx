import { useAuth } from "@clerk/clerk-expo";
import { FlashList } from "@shopify/flash-list";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { PersonSummary } from "@/db/repos/peopleRepo";
import { usePeopleData } from "@/features/people/usePeopleData";
import { AppShell } from "@/ui/AppShell";
import { Card } from "@/ui/Card";
import { SectionLabel } from "@/ui/SectionLabel";

function formatAge(birthday: string | null, yearKnown: boolean) {
  if (!birthday || !yearKnown) return null;
  const birthYear = Number(birthday.slice(0, 4));
  if (!birthYear || birthYear < 1900) return null;
  const now = new Date();
  let age = now.getFullYear() - birthYear;
  const month = Number(birthday.slice(5, 7)) - 1;
  const day = Number(birthday.slice(8, 10));
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age--;
  if (age < 0) return null;
  return `${age} years`;
}

function formatLastSeen(date: Date | null) {
  if (!date) return null;
  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}

function PersonRowCard({ person }: { person: PersonSummary }) {
  const age = formatAge(person.birthday, person.birthdayYearKnown);
  const lastSeen = formatLastSeen(person.lastInteractionAt);

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
                {person.relationType}
              </Text>
            ) : null}
            {lastSeen ? (
              <Text className="text-[12px] text-text3 font-body mt-2">Last contact {lastSeen}</Text>
            ) : null}
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function PeopleListScreen() {
  const { userId } = useAuth();
  const { people, loading, error } = usePeopleData(userId);
  const activePeople = people.filter((p) => !p.archived);

  const listHeader = (
    <View className="px-4">
      <View className="pt-1 pb-2">
        <Text className="text-[30px] leading-[36px] text-text1 font-heading">People</Text>
        <Text className="text-[13px] text-text2 font-body mt-1">
          Your relationship memory space.
        </Text>
        <Link href="/people/new" className="text-[12px] text-accent font-bodyMedium mt-2">
          + Add person
        </Link>
      </View>
      <SectionLabel>People list</SectionLabel>
      {loading ? <Text className="text-[13px] text-text3 font-body">Loading people…</Text> : null}
      {error ? <Text className="text-[13px] text-red font-body">{error}</Text> : null}
    </View>
  );

  const listEmpty =
    !loading && !error ? (
      <View className="px-4">
        <Text className="text-[13px] text-text3 font-body">No people yet.</Text>
      </View>
    ) : null;

  return (
    <AppShell>
      <FlashList
        data={loading || error ? [] : activePeople}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="px-4">
            <PersonRowCard person={item} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </AppShell>
  );
}
