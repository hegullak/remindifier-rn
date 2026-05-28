import { Link, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { createPersonEntry, deletePersonEntry } from "@/db/repos/peopleRepo";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { AppShell } from "@/ui/AppShell";
import { SectionLabel } from "@/ui/SectionLabel";

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function entryTypeLabel(entryType: string) {
  if (entryType === "follow_up") return "follow-up";
  return "note";
}

export default function PersonDetailScreen() {
  const { userId } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle, loading, error, reload } = usePersonProfileData(userId, id);
  const [entryType, setEntryType] = useState<"note" | "follow_up">("note");
  const [entryBody, setEntryBody] = useState("");
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);

  const submitEntry = async () => {
    if (!userId || !id) {
      setEntryError("Missing user or person.");
      return;
    }
    const body = entryBody.trim();
    if (!body) {
      setEntryError("Write a short note first.");
      return;
    }
    setEntrySaving(true);
    setEntryError(null);
    try {
      await createPersonEntry(userId, { personId: id, type: entryType, body });
      setEntryBody("");
      reload();
    } catch (err: unknown) {
      setEntryError(err instanceof Error ? err.message : "Failed to save note.");
    } finally {
      setEntrySaving(false);
    }
  };

  const confirmDeleteEntry = (entryId: string) => {
    if (!userId) return;
    Alert.alert("Remove note?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await deletePersonEntry(userId, entryId);
          reload();
        },
      },
    ]);
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Text className="text-[30px] leading-[36px] text-text1 font-heading">
            {bundle?.person.displayName ?? "Person"}
          </Text>
          {id ? (
            <Link href={`/people/${id}/edit`} className="text-[12px] text-accent font-bodyMedium mt-2">
              Edit person →
            </Link>
          ) : null}
          {bundle?.person.relationType ? (
            <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-1">
              {bundle.person.relationType}
            </Text>
          ) : null}
        </View>

        {loading ? <Text className="text-[13px] text-text3 font-body">Loading profile…</Text> : null}
        {error ? <Text className="text-[13px] text-red font-body">{error}</Text> : null}
        {!loading && !error && !bundle ? (
          <Text className="text-[13px] text-text3 font-body">Person not found.</Text>
        ) : null}

        {bundle ? (
          <>
            <SectionLabel>Red-letter days</SectionLabel>
            {bundle.redLetterDays.length === 0 ? (
              <Text className="text-[13px] text-text3 font-body">No red-letter days yet.</Text>
            ) : (
              bundle.redLetterDays.map((item) => (
                <View
                  key={item.id}
                  className="bg-card border border-border rounded-lg px-4 py-3 mb-2"
                >
                  <Text className="text-[11px] uppercase tracking-[1.2px] text-amber font-bodySemi">
                    {formatDate(item.eventDate)} · {item.kind.toLowerCase()}
                  </Text>
                  {item.label ? (
                    <Text className="text-[13px] text-text2 font-body mt-1">{item.label}</Text>
                  ) : null}
                </View>
              ))
            )}

            <SectionLabel>Relationships</SectionLabel>
            {bundle.links.length === 0 ? (
              <Text className="text-[13px] text-text3 font-body">No links yet.</Text>
            ) : (
              bundle.links.map((link) => (
                <View
                  key={link.id}
                  className="bg-card border border-border rounded-lg px-4 py-3 mb-2"
                >
                  <Text className="text-[14px] text-text1 font-bodyMedium">
                    {link.direction === "outgoing" ? "→" : "←"} {link.otherPersonName}
                  </Text>
                  <Text className="text-[12px] text-text3 font-body mt-1">{link.label}</Text>
                  {link.notes ? (
                    <Text className="text-[12px] text-text2 font-body mt-1">{link.notes}</Text>
                  ) : null}
                </View>
              ))
            )}

            <SectionLabel>Timeline</SectionLabel>
            <View className="bg-card border border-border rounded-lg px-4 py-3 mb-3">
              <Text className="text-[11px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                Add note
              </Text>
              <View className="flex-row gap-2 mt-2">
                <Pressable
                  onPress={() => setEntryType("note")}
                  className={`px-3 py-1.5 rounded-pill border ${
                    entryType === "note" ? "bg-accent border-accent" : "bg-bg2 border-border"
                  }`}
                >
                  <Text
                    className={`text-[12px] font-bodyMedium ${
                      entryType === "note" ? "text-card" : "text-text2"
                    }`}
                  >
                    Note
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setEntryType("follow_up")}
                  className={`px-3 py-1.5 rounded-pill border ${
                    entryType === "follow_up" ? "bg-accent border-accent" : "bg-bg2 border-border"
                  }`}
                >
                  <Text
                    className={`text-[12px] font-bodyMedium ${
                      entryType === "follow_up" ? "text-card" : "text-text2"
                    }`}
                  >
                    Follow-up
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={entryBody}
                onChangeText={setEntryBody}
                placeholder="Something worth remembering..."
                placeholderTextColor="#7A8CAD"
                multiline
                numberOfLines={3}
                className="mt-2 bg-bg2 border border-border rounded-md px-3 py-3 text-[14px] text-text1 font-body"
                style={{ textAlignVertical: "top", minHeight: 90 }}
              />

              {entryError ? <Text className="text-[12px] text-red font-body mt-2">{entryError}</Text> : null}

              <Pressable
                onPress={submitEntry}
                disabled={entrySaving}
                className="mt-3 bg-accent rounded-lg py-3 px-4 items-center"
              >
                <Text className="text-[14px] text-card font-bodySemi">
                  {entrySaving ? "Saving..." : "Add to timeline"}
                </Text>
              </Pressable>
            </View>
            {bundle.timeline.length === 0 ? (
              <Text className="text-[13px] text-text3 font-body">No notes yet.</Text>
            ) : (
              bundle.timeline.map((entry) => (
                <View key={entry.id} className="border-l-2 border-border pl-3 py-2 mb-2">
                  <View className="flex-row items-start justify-between gap-2">
                    <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodyMedium flex-1">
                      {formatDate(entry.occurredAt.toISOString())} ·{" "}
                      {entryTypeLabel(entry.entryType)}
                    </Text>
                    <Pressable onPress={() => confirmDeleteEntry(entry.id)} hitSlop={8}>
                      <Text className="text-[14px] text-text3 font-body">✕</Text>
                    </Pressable>
                  </View>
                  <Text className="text-[14px] text-text2 font-body mt-1">{entry.body}</Text>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
