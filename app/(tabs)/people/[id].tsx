import { useAuth } from "@clerk/clerk-expo";
import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, useColorScheme, View } from "react-native";
import { createPersonEntry, deletePerson, deletePersonEntry } from "@/db/repos/peopleRepo";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { useTranslation } from "@/i18n/LanguageContext";
import { translateRelationType } from "@/i18n/relationTypes";
import type { Locale } from "@/i18n/types";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { IconButton } from "@/ui/IconButton";
import { SectionLabel } from "@/ui/SectionLabel";

function formatDate(iso: string, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  return date.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
}

export default function PersonDetailScreen() {
  const { userId } = useAuth();
  const { t, locale } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle, loading, error, reload } = usePersonProfileData(userId, id);
  const colorScheme = useColorScheme();
  const [entryType, setEntryType] = useState<"note" | "follow_up">("note");
  const [entryBody, setEntryBody] = useState("");
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(false);

  const submitEntry = async () => {
    if (!userId || !id) {
      setEntryError(t("people.missingUserOrPerson"));
      return;
    }
    const body = entryBody.trim();
    if (!body) {
      setEntryError(t("people.writeNoteFirst"));
      return;
    }
    setEntrySaving(true);
    setEntryError(null);
    try {
      await createPersonEntry(userId, { personId: id, type: entryType, body });
      setEntryBody("");
      reload();
    } catch (err: unknown) {
      setEntryError(err instanceof Error ? err.message : t("people.saveNoteFailed"));
    } finally {
      setEntrySaving(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!userId || !entryToDelete) return;
    setDeletingEntry(true);
    try {
      await deletePersonEntry(userId, entryToDelete);
      setEntryToDelete(null);
      reload();
    } finally {
      setDeletingEntry(false);
    }
  };

  const handleDeletePerson = async () => {
    if (!userId || !id) return;
    setDeletingPerson(true);
    try {
      await deletePerson(userId, id);
      setConfirmDeletePerson(false);
      router.replace("/people");
    } finally {
      setDeletingPerson(false);
    }
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <View className="flex-row items-start justify-between gap-2">
            <View className="flex-1 min-w-0">
              <Text className="text-[30px] leading-[36px] text-text1 font-heading">
                {bundle?.person.displayName ?? t("people.personFallback")}
              </Text>
              {bundle?.person.relationType ? (
                <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-1">
                  {translateRelationType(bundle.person.relationType, locale)}
                </Text>
              ) : null}
            </View>
            {id ? (
              <View className="flex-row gap-2 mt-1">
                <Link href={`/people/${id}/edit`} asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("people.editPersonA11y")}
                    className="w-[34px] h-[34px] rounded-md items-center justify-center bg-card2 border border-border active:opacity-70"
                  >
                    <Text className="text-[16px] text-text2 font-body">✎</Text>
                  </Pressable>
                </Link>
                <IconButton
                  accessibilityLabel={t("people.deletePersonA11y")}
                  onPress={() => setConfirmDeletePerson(true)}
                >
                  <Text className="text-[16px] text-red font-body">🗑</Text>
                </IconButton>
              </View>
            ) : null}
          </View>
        </View>

        {loading ? (
          <Text className="text-[13px] text-text3 font-body">{t("people.loadingProfile")}</Text>
        ) : null}
        {error ? <Text className="text-[13px] text-red font-body">{error}</Text> : null}
        {!loading && !error && !bundle ? (
          <Text className="text-[13px] text-text3 font-body">{t("people.notFound")}</Text>
        ) : null}

        {bundle ? (
          <>
            <SectionLabel>{t("people.redLetterDays")}</SectionLabel>
            {bundle.redLetterDays.length === 0 ? (
              <Text className="text-[13px] text-text3 font-body">
                {t("people.noRedLetterDays")}
              </Text>
            ) : (
              bundle.redLetterDays.map((item) => (
                <Card key={item.id}>
                  <Text className="text-[11px] uppercase tracking-[1.2px] text-amber font-bodySemi">
                    {formatDate(item.eventDate, locale)} · {item.kind.toLowerCase()}
                  </Text>
                  {item.label ? (
                    <Text className="text-[13px] text-text2 font-body mt-1">{item.label}</Text>
                  ) : null}
                </Card>
              ))
            )}

            <SectionLabel>{t("people.relationships")}</SectionLabel>
            {bundle.links.length === 0 ? (
              <Text className="text-[13px] text-text3 font-body">{t("people.noLinks")}</Text>
            ) : (
              bundle.links.map((link) => (
                <Link key={link.id} href={`/people/${link.otherPersonId}`} asChild>
                  <Pressable>
                    <Card>
                      <Text className="text-[14px] text-text1 font-bodyMedium">
                        {link.direction === "outgoing" ? "→" : "←"} {link.otherPersonName}
                      </Text>
                      <Text className="text-[12px] text-text3 font-body mt-1">
                        {translateRelationType(link.label, locale) ?? link.label}
                      </Text>
                      {link.notes ? (
                        <Text className="text-[12px] text-text2 font-body mt-1">{link.notes}</Text>
                      ) : null}
                    </Card>
                  </Pressable>
                </Link>
              ))
            )}

            <SectionLabel>{t("people.timeline")}</SectionLabel>
            {bundle.timeline.map((entry) => (
              <View key={entry.id} className="border-l-2 border-border pl-3 py-2 mb-2">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodyMedium flex-1">
                    {formatDate(entry.occurredAt.toISOString(), locale)} ·{" "}
                    {entry.entryType === "follow_up" ? t("people.followUp") : t("people.note")}
                  </Text>
                  <Pressable onPress={() => setEntryToDelete(entry.id)} hitSlop={8}>
                    <Text className="text-[14px] text-text3 font-body">✕</Text>
                  </Pressable>
                </View>
                <Text className="text-[14px] text-text2 font-body mt-1">{entry.body}</Text>
              </View>
            ))}
            {bundle.timeline.length === 0 ? (
              <Text className="text-[13px] text-text3 font-body mb-2">{t("people.noNotes")}</Text>
            ) : null}
            <Card style={{ marginBottom: 12 }}>
              <Text className="text-[11px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                {t("people.addNote")}
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
                    {t("people.noteType")}
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
                    {t("people.followUpType")}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={entryBody}
                onChangeText={setEntryBody}
                placeholder={t("people.notePlaceholder")}
                placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
                multiline
                numberOfLines={3}
                className="mt-2 bg-bg2 border border-border rounded-md px-3 py-3 text-[14px] text-text1 font-body"
                style={{ textAlignVertical: "top", minHeight: 90 }}
              />

              {entryError ? (
                <Text className="text-[12px] text-red font-body mt-2">{entryError}</Text>
              ) : null}

              <View className="mt-3">
                <Button
                  variant="primary"
                  onPress={submitEntry}
                  loading={entrySaving}
                  disabled={entrySaving}
                >
                  {t("people.addToTimeline")}
                </Button>
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={entryToDelete !== null}
        onDismiss={() => setEntryToDelete(null)}
        title={t("people.removeNoteTitle")}
      >
        <Text className="text-[14px] text-text2 font-body mb-4">{t("people.removeNoteBody")}</Text>
        <View className="gap-2">
          <Button
            variant="primary"
            onPress={handleDeleteEntry}
            loading={deletingEntry}
            disabled={deletingEntry}
          >
            {t("common.remove")}
          </Button>
          <Button variant="ghost" onPress={() => setEntryToDelete(null)} disabled={deletingEntry}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={confirmDeletePerson}
        onDismiss={() => setConfirmDeletePerson(false)}
        title={t("people.deletePersonTitle")}
      >
        <Text className="text-[14px] text-text2 font-body mb-4">
          {t("people.deletePersonBody", {
            name: bundle?.person.displayName ?? t("people.deletePersonFallback"),
          })}
        </Text>
        <View className="gap-2">
          <Button
            variant="primary"
            onPress={handleDeletePerson}
            loading={deletingPerson}
            disabled={deletingPerson}
          >
            {t("people.deletePersonButton")}
          </Button>
          <Button
            variant="ghost"
            onPress={() => setConfirmDeletePerson(false)}
            disabled={deletingPerson}
          >
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>
    </AppShell>
  );
}
