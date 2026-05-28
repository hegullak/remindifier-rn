import { router } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { createPerson } from "@/db/repos/peopleRepo";
import { PersonForm } from "@/features/people/PersonForm";

export default function NewPersonScreen() {
  const { userId } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-3 pb-2">
          <Text className="text-[30px] leading-[36px] text-text1 font-heading">New person</Text>
          <Text className="text-[13px] text-text2 font-body mt-1">
            Add someone you want to keep showing up for.
          </Text>
        </View>

        <PersonForm
          submitLabel="Create person"
          onSubmit={async (payload) => {
            if (!userId) throw new Error("Not signed in");
            const id = await createPerson(userId, payload);
            router.replace(`/people/${id}`);
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
