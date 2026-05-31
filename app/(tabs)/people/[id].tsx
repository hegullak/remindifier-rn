import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Keyboard, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from "react-native";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import { createPersonEntry, deletePerson, deletePersonEntry } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
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
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
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
  const [showActions, setShowActions] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

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
      triggerMedium();
      Keyboard.dismiss();
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
      triggerMedium();
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
      triggerMedium();
      Keyboard.dismiss();
      setConfirmDeletePerson(false);
      router.replace("/people");
    } finally {
      setDeletingPerson(false);
    }
  };

  return (
    <AppShell
      headerLeft={
        returnTo ? (
          <Pressable
            onPress={() => { triggerLight(); Keyboard.dismiss(); router.replace(returnTo); }}
            hitSlop={12}
            accessibilityLabel="Back"
          >
            <Text className="text-[20px] text-accent font-body">←</Text>
          </Pressable>
        ) : null
      }
      headerRight={
        id ? (
          <Pressable
            onPress={() => { triggerLight(); setShowActions(true); }}
            hitSlop={12}
            accessibilityLabel="More actions"
          >
            <Text className="text-[22px] text-text2 font-body">⋯</Text>
          </Pressable>
        ) : null
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        <View className="pt-1 pb-2">
          <Text className="text-[30px] leading-[36px] text-text1 font-heading">
            {bundle?.person.displayName ?? t("people.personFallback")}
          </Text>
          {bundle?.person.relationType ? (
            <Text className="text-[11px] uppercase tracking-[1.5px] text-text3 font-bodySemi mt-1">
              {translateRelationType(bundle.person.relationType, locale)}
            </Text>
          ) : null}
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
            {bundle.person.interests.length > 0 ? (
              <>
                <SectionLabel>{t("people.funFacts")}</SectionLabel>
                <Card style={{ marginBottom: 4 }}>
                  {bundle.person.interests.map((fact, i) => (
                    <Text
                      key={i}
                      className={`text-[14px] text-text2 font-body leading-[21px] ${i > 0 ? "mt-1" : ""}`}
                    >
                      · {fact}
                    </Text>
                  ))}
                </Card>
              </>
            ) : null}

            {bundle.gatherings.length > 0 ? (
              <>
                <View className="flex-row items-center justify-between mb-1">
                  <SectionLabel>{t("people.events")}</SectionLabel>
                  <Pressable
                    onPress={() => {
                      triggerLight();
                      Keyboard.dismiss();
                      router.push(`/gather/new?personId=${id}`);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={t("people.addEvent")}
                  >
                    <Text className="text-[18px] text-accent font-body leading-[18px]">+</Text>
                  </Pressable>
                </View>
                {bundle.gatherings.map((g) => (
                  <Link key={g.id} href={`/gather/${g.id}`} asChild>
                    <Pressable>
                      <Card style={{ marginBottom: 4 }}>
                        <Text className="text-[14px] text-text1 font-bodyMedium">{g.title}</Text>
                        {g.scheduledAt ? (
                          <Text className="text-[11px] text-text3 font-body mt-1">
                            {formatDate(g.scheduledAt.toISOString(), locale)}
                          </Text>
                        ) : null}
                      </Card>
                    </Pressable>
                  </Link>
                ))}
              </>
            ) : (
              <View className="flex-row items-center justify-between mb-1">
                <SectionLabel>{t("people.events")}</SectionLabel>
                <Pressable
                  onPress={() => {
                    triggerLight();
                    Keyboard.dismiss();
                    router.push(`/gather/new?personId=${id}`);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t("people.addEvent")}
                >
                  <Text className="text-[16px] text-accent font-body">✦</Text>
                </Pressable>
              </View>
            )}

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
                        {link.otherPersonName}
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
                  <Pressable
                    onPress={() => {
                      triggerLight();
                      setEntryToDelete(entry.id);
                    }}
                    hitSlop={8}
                  >
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
                  onPress={() => {
                    triggerSelection();
                    setEntryType("note");
                  }}
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
                  onPress={() => {
                    triggerSelection();
                    setEntryType("follow_up");
                  }}
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
        visible={showActions}
        onDismiss={() => setShowActions(false)}
        title={bundle?.person.displayName ?? ""}
      >
        <View className="gap-3 pt-1">
          {id ? (
            <Link href={`/people/${id}/edit`} asChild>
              <Pressable
                onPress={() => { triggerLight(); setShowActions(false); }}
                className="flex-row items-center gap-4 py-2"
              >
                <View className="w-11 h-11 rounded-xl bg-amber-light items-center justify-center">
                  <Text className="text-[20px]">✏️</Text>
                </View>
                <Text className="text-[16px] text-text1 font-bodyMedium">{t("people.editPersonA11y")}</Text>
              </Pressable>
            </Link>
          ) : null}
          <Pressable
            onPress={() => { triggerLight(); setShowActions(false); setTimeout(() => setConfirmDeletePerson(true), 300); }}
            className="flex-row items-center gap-4 py-2"
          >
            <View className="w-11 h-11 rounded-xl bg-red-light items-center justify-center">
              <Text className="text-[18px]">🗑</Text>
            </View>
            <Text className="text-[16px] text-red font-bodyMedium">{t("people.deletePersonTitle")}</Text>
          </Pressable>
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
