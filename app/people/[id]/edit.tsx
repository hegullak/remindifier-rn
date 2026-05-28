import { Link, router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { deletePerson, updatePerson } from "@/db/repos/peopleRepo";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { PersonForm } from "@/features/people/PersonForm";

export default function EditPersonScreen() {
  const { userId } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle, loading, error } = usePersonProfileData(userId, id);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-3 pb-2">
          <Link href={id ? `/people/${id}` : "/people"} className="text-[12px] text-accent font-bodyMedium">
            ← Back
          </Link>
          <Text className="text-[30px] leading-[36px] text-text1 font-heading mt-2">Edit person</Text>
        </View>

        {loading ? <Text className="text-[13px] text-text3 font-body">Loading…</Text> : null}
        {error ? <Text className="text-[13px] text-red font-body">{error}</Text> : null}
        {!loading && !error && !bundle ? (
          <Text className="text-[13px] text-text3 font-body">Person not found.</Text>
        ) : null}

        {bundle ? (
          <PersonForm
            initial={{
              displayName: bundle.person.displayName,
              relationType: bundle.person.relationType,
              birthday: bundle.person.birthday,
              birthdayYearKnown: bundle.person.birthdayYearKnown,
              isSensitive: (bundle.person.sensitiveTopics ?? []).includes("handle_with_care"),
              funFacts: bundle.person.interests ?? [],
            }}
            submitLabel="Save changes"
            onSubmit={async (payload) => {
              if (!userId || !id) throw new Error("Missing auth or person");
              await updatePerson(userId, id, payload);
              router.replace(`/people/${id}`);
            }}
            onDelete={async () => {
              if (!userId || !id) throw new Error("Missing auth or person");
              await deletePerson(userId, id);
              router.replace("/people");
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
