import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import { createPersonEntry, deletePerson, deletePersonEntry, updatePersonEntry } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { useTranslation } from "@/i18n/LanguageContext";
import { translateRelationType } from "@/i18n/relationTypes";
import type { Locale } from "@/i18n/types";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import type { AddMenuSection } from "@/ui/GlobalAddButton";
import { SectionLabel } from "@/ui/SectionLabel";

function formatDate(iso: string, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  return date.toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" });
}

const MONOGRAM_COLORS = ["bg-accent", "bg-sage", "bg-amber", "bg-dusk", "bg-blue", "bg-green"];

function monogramColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return MONOGRAM_COLORS[h % MONOGRAM_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export default function PersonDetailScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { bundle, loading, error, reload } = usePersonProfileData(userId, id);
  const colorScheme = useColorScheme();
  const mountedRef = useRef(true);
  const scrollViewRef = useRef<ScrollView>(null);
  useEffect(() => () => { mountedRef.current = false; }, []);
  const [entryBody, setEntryBody] = useState("");
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);
  const [confirmDeletePerson, setConfirmDeletePerson] = useState(false);
  const [deletingPerson, setDeletingPerson] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryText, setEditingEntryText] = useState("");

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  const addMenuSections = useMemo((): AddMenuSection[] => {
    if (!id) return [];
    return [
      {
        title: t("people.personMenuSection"),
        actions: [
          {
            icon: "✎",
            bgClass: "bg-amber-light",
            label: t("people.editPersonA11y"),
            onPress: () => router.push(`/people/${id}/edit`),
          },
          {
            icon: "🗑",
            bgClass: "bg-red-light",
            label: t("people.deletePersonTitle"),
            destructive: true,
            onPress: () => {
              setTimeout(() => {
                if (mountedRef.current) setConfirmDeletePerson(true);
              }, 300);
            },
          },
        ],
      },
    ];
  }, [id, t]);

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
      await createPersonEntry(userId, { personId: id, type: "follow_up", body });
      triggerMedium();
      Keyboard.dismiss();
      setEntryBody("");
      setShowNoteInput(false);
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

  const saveEntryEdit = async (entryId: string) => {
    const trimmed = editingEntryText.trim();
    setEditingEntryId(null);
    setEditingEntryText("");
    if (!userId || !trimmed) return;
    await updatePersonEntry(userId, entryId, trimmed);
    triggerLight();
    reload();
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
      addMenuSections={addMenuSections}
      headerLeft={
        <Pressable
          onPress={() => {
            triggerLight();
            Keyboard.dismiss();
            router.replace(returnTo ?? "/people");
          }}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Text className="text-xl text-accent font-body">←</Text>
        </Pressable>
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
      <ScrollView
        ref={scrollViewRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
      >
        <View className="flex-row items-center gap-4 pt-2 pb-4">
          {bundle ? (
            <View
              className={`w-16 h-16 rounded-full items-center justify-center ${monogramColor(bundle.person.displayName)}`}
            >
              <Text className="text-xl text-card font-heading">
                {initials(bundle.person.displayName)}
              </Text>
            </View>
          ) : null}
          <View className="flex-1">
            <Text className="text-3xl leading-[36px] text-text1 font-heading">
              {bundle?.person.displayName ?? t("people.personFallback")}
            </Text>
            {bundle?.person.relationType ? (
              <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mt-1">
                {translateRelationType(bundle.person.relationType, locale)}
              </Text>
            ) : null}
          </View>
        </View>

        {loading ? (
          <Text className="text-body text-text3 font-body">{t("people.loadingProfile")}</Text>
        ) : null}
        {error ? <Text className="text-body text-red font-body">{error}</Text> : null}
        {!loading && !error && !bundle ? (
          <Text className="text-body text-text3 font-body">{t("people.notFound")}</Text>
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
                      className={`text-sm text-text2 font-body leading-[21px] ${i > 0 ? "mt-1" : ""}`}
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
                    <Text className="text-lg text-accent font-body leading-[18px]">+</Text>
                  </Pressable>
                </View>
                {bundle.gatherings.map((g) => (
                  <Link key={g.id} href={`/gather/${g.id}`} asChild>
                    <Pressable>
                      <Card style={{ marginBottom: 4 }}>
                        <Text className="text-sm text-text1 font-bodyMedium">{g.title}</Text>
                        {g.scheduledAt ? (
                          <Text className="text-3xs text-text3 font-body mt-1">
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
                  <Text className="text-base text-accent font-body">✦</Text>
                </Pressable>
              </View>
            )}

            {bundle.redLetterDays.length > 0 ? (
              <>
                <SectionLabel>{t("people.redLetterDays")}</SectionLabel>
                {bundle.redLetterDays.map((item) => (
                  <Card key={item.id}>
                    <Text className="text-3xs uppercase tracking-[1.2px] text-amber font-bodySemi">
                      {formatDate(item.eventDate, locale)} · {item.kind.toLowerCase()}
                    </Text>
                    {item.label ? (
                      <Text className="text-body text-text2 font-body mt-1">{item.label}</Text>
                    ) : null}
                  </Card>
                ))}
              </>
            ) : null}

            {bundle.links.length > 0 ? (
              <>
                <SectionLabel>{t("people.relationships")}</SectionLabel>
                {bundle.links.map((link) => (
                <Link key={link.id} href={`/people/${link.otherPersonId}`} asChild>
                  <Pressable>
                    <Card>
                      <Text className="text-sm text-text1 font-bodyMedium">
                        {link.otherPersonName}
                      </Text>
                      <Text className="text-xs text-text3 font-body mt-1">
                        {translateRelationType(link.label, locale) ?? link.label}
                      </Text>
                      {link.notes ? (
                        <Text className="text-xs text-text2 font-body mt-1">{link.notes}</Text>
                      ) : null}
                    </Card>
                  </Pressable>
                </Link>
                ))}
              </>
            ) : null}

            <SectionLabel>{t("people.followUpsTitle")}</SectionLabel>
            {bundle.timeline.map((entry) => {
              const isEditing = editingEntryId === entry.id;
              return (
              <View key={entry.id} style={{ borderRadius: 12, overflow: "hidden", marginBottom: 8 }}>
                <Swipeable
                  friction={1.5}
                  overshootRight={false}
                  rightThreshold={40}
                  enabled={!isEditing}
                  renderRightActions={() => (
                    <View className="flex-row">
                      <Pressable
                        onPress={() => { triggerSelection(); setEditingEntryText(entry.body); setEditingEntryId(entry.id); }}
                        className="bg-amber items-center justify-center px-5"
                      >
                        <Text className="text-xl" style={{ color: "#fff" }}>✎</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => { triggerLight(); setEntryToDelete(entry.id); }}
                        className="bg-red items-center justify-center px-5"
                      >
                        <Text className="text-xl" style={{ color: "#fff" }}>🗑</Text>
                      </Pressable>
                    </View>
                  )}
                >
                  <View className="border-l-2 border-accent pl-3 py-3 bg-bg">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-sm">🔔</Text>
                      <Text className="text-2xs uppercase tracking-[1.2px] text-text3 font-bodyMedium">
                        {formatDate(entry.occurredAt.toISOString(), locale)}
                      </Text>
                    </View>
                    {isEditing ? (
                      <TextInput
                        value={editingEntryText}
                        onChangeText={setEditingEntryText}
                        autoFocus
                        multiline
                        returnKeyType="done"
                        onBlur={() => void saveEntryEdit(entry.id)}
                        onSubmitEditing={() => void saveEntryEdit(entry.id)}
                        className="text-body-lg text-text1 font-body mt-1 bg-transparent"
                        style={{ minHeight: 24 }}
                      />
                    ) : (
                      <Text className="text-body-lg text-text1 font-body mt-1">{entry.body}</Text>
                    )}
                  </View>
                </Swipeable>
              </View>
              );
            })}
            {bundle.timeline.length === 0 && !showNoteInput ? (
              <Text className="text-body text-text3 font-body mb-2">{t("people.noFollowUps")}</Text>
            ) : null}

            {!showNoteInput ? (
              <Pressable
                onPress={() => {
                  triggerLight();
                  setShowNoteInput(true);
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                }}
                className="flex-row items-center gap-2 py-3 active:opacity-60"
              >
                <Text className="text-xl text-accent font-body">+</Text>
                <Text className="text-body text-text3 font-body">{t("people.addFollowUp")}</Text>
              </Pressable>
            ) : (
            <Card style={{ marginBottom: 12 }}>
              <View className="flex-row items-center gap-2">
                <TextInput
                  value={entryBody}
                  onChangeText={setEntryBody}
                  placeholder={t("people.followUpPlaceholder")}
                  placeholderTextColor={colorScheme === "dark" ? "#7A8CAD" : "#A89E90"}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={submitEntry}
                  className="flex-1 bg-bg2 border border-border rounded-md px-3 text-sm text-text1 font-body"
                  style={{ paddingVertical: 10, minHeight: 44 }}
                />
                <Pressable
                  onPress={submitEntry}
                  hitSlop={8}
                  disabled={entrySaving}
                  className="w-10 h-10 rounded-full bg-accent items-center justify-center active:opacity-70"
                >
                  <Text className="text-base text-card font-bodySemi">✓</Text>
                </Pressable>
                <Pressable
                  onPress={() => { triggerLight(); setShowNoteInput(false); setEntryBody(""); setEntryError(null); Keyboard.dismiss(); }}
                  hitSlop={8}
                  className="p-1"
                >
                  <Text className="text-body-lg text-text3">✕</Text>
                </Pressable>
              </View>
              {entryError ? (
                <Text className="text-xs text-red font-body mt-2">{entryError}</Text>
              ) : null}
            </Card>
            )}
          </>
        ) : null}
      </ScrollView>
      </KeyboardAvoidingView>

      <BottomSheet
        visible={entryToDelete !== null}
        onDismiss={() => setEntryToDelete(null)}
        title={t("people.removeNoteTitle")}
      >
        <Text className="text-sm text-text2 font-body mb-4">{t("people.removeNoteBody")}</Text>
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
        <Text className="text-sm text-text2 font-body mb-4">
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
