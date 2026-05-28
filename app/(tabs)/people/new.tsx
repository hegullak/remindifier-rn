import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { createPerson } from "@/db/repos/peopleRepo";
import { PersonForm } from "@/features/people/PersonForm";
import { qrPayloadToPersonPrefill } from "@/lib/me/qr-payload";
import { AppShell } from "@/ui/AppShell";

export default function NewPersonScreen() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{
    prefillName?: string;
    prefillBirthday?: string;
    prefillBirthdayYearKnown?: string;
    prefillAbout?: string;
    prefillContact?: string;
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

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Text className="text-[30px] leading-[36px] text-text1 font-heading">New person</Text>
          <Text className="text-[13px] text-text2 font-body mt-1">
            {scannedInitial
              ? "Fra QR-kode — sjekk og lagre når det ser riktig ut."
              : "Add someone you want to keep showing up for."}
          </Text>
        </View>

        <PersonForm
          key={scannedInitial ? `scan-${params.prefillName}` : "new"}
          initial={scannedInitial}
          submitLabel="Create person"
          onSubmit={async (payload) => {
            if (!userId) throw new Error("Not signed in");
            const id = await createPerson(userId, payload);
            router.replace(`/people/${id}`);
          }}
        />
      </ScrollView>
    </AppShell>
  );
}
