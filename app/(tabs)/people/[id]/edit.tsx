import { useAuth } from "@clerk/clerk-expo";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { deletePerson, updatePerson } from "@/db/repos/peopleRepo";
import { PersonForm, type PersonFormHandle } from "@/features/people/PersonForm";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import type { RedLetterKind } from "@/lib/red-letter-day";
import { AppShell } from "@/ui/AppShell";

export default function EditPersonScreen() {
  const { userId } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle, loading, error } = usePersonProfileData(userId, id);
  const formRef = useRef<PersonFormHandle>(null);
  const [saving, setSaving] = useState(false);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Link
            href={id ? `/people/${id}` : "/people"}
            className="text-[12px] text-accent font-bodyMedium"
          >
            ← Back
          </Link>
          <Text className="text-[30px] leading-[36px] text-text1 font-heading mt-2">
            Edit person
          </Text>
        </View>

        {loading ? <Text className="text-[13px] text-text3 font-body">Loading…</Text> : null}
        {error ? <Text className="text-[13px] text-red font-body">{error}</Text> : null}
        {!loading && !error && !bundle ? (
          <Text className="text-[13px] text-text3 font-body">Person not found.</Text>
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

            <View className="gap-2 mt-2">
              <Pressable
                onPress={() => formRef.current?.submit()}
                disabled={saving}
                className="bg-accent rounded-lg py-3 px-4 items-center opacity-100 disabled:opacity-50"
              >
                <Text className="text-[14px] text-card font-bodySemi">
                  {saving ? "Saving..." : "Save changes"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => formRef.current?.delete()}
                disabled={saving}
                className="py-3 px-4 items-center opacity-100 disabled:opacity-50"
              >
                <Text className="text-[13px] text-red font-bodyMedium">Delete person</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
