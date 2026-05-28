import { Link } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ScrollView, Text, View } from "react-native";
import { usePeopleData } from "@/features/people/usePeopleData";
import { AppShell } from "@/ui/AppShell";
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

export default function PeopleListScreen() {
  const { userId } = useAuth();
  const { people, loading, error } = usePeopleData(userId);
  const activePeople = people.filter((p) => !p.archived);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
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
        {loading ? (
          <Text className="text-[13px] text-text3 font-body">Loading people…</Text>
        ) : error ? (
          <Text className="text-[13px] text-red font-body">{error}</Text>
        ) : activePeople.length === 0 ? (
          <Text className="text-[13px] text-text3 font-body">No people yet.</Text>
        ) : (
          activePeople.map((person) => {
            const age = formatAge(person.birthday, person.birthdayYearKnown);
            const lastSeen = formatLastSeen(person.lastInteractionAt);

            return (
              <Link
                key={person.id}
                href={`/people/${person.id}`}
                className="bg-card border border-border rounded-lg px-4 py-3 mb-2"
              >
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
              </Link>
            );
          })
        )}
      </ScrollView>
    </AppShell>
  );
}
