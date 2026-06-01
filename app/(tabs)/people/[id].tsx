import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { deleteGathering } from "@/db/repos/gatheringsRepo";
import {
  createPersonEntry,
  deletePerson,
  deletePersonEntry,
  updatePerson,
  updatePersonEntry,
} from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { PersonProfileHeader } from "@/features/people/PersonProfileHeader";
import { RedLetterDaysSection } from "@/features/people/RedLetterDaysSection";
import { SwipeEditDeleteActions } from "@/features/people/SwipeEditDeleteActions";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { useTranslation } from "@/i18n/LanguageContext";
import { redLetterDisplayLabel, redLetterKindIcon } from "@/i18n/redLetterKinds";
import type { Locale } from "@/i18n/types";
import type { RedLetterDayInput, RedLetterKind } from "@/lib/red-letter-day";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
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

function mapRedLetterDays(bundle: NonNullable<ReturnType<typeof usePersonProfileData>["bundle"]>) {
  return bundle.redLetterDays.map((d) => ({
    id: d.id,
    kind: d.kind as RedLetterKind,
    label: d.label,
    eventDate: d.eventDate,
    yearKnown: d.yearKnown,
    recurring: d.recurring,
  }));
}

function mergeBirthdayRedLetterDay(
  days: RedLetterDayInput[],
  birthday: string | null,
  yearKnown: boolean,
): RedLetterDayInput[] {
  const withoutBirthday = days.filter((d) => d.kind !== "Birthday");
  if (!birthday?.trim()) return withoutBirthday;
  const existing = days.find((d) => d.kind === "Birthday");
  return [
    ...withoutBirthday,
    {
      id: existing?.id,
      kind: "Birthday",
      label: null,
      eventDate: birthday.trim(),
      yearKnown,
      recurring: true,
    },
  ];
}

function SectionAddHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View className="flex-row items-center justify-between mb-1">
      <SectionLabel>{title}</SectionLabel>
      <Pressable
        onPress={() => {
          triggerLight();
          onAdd();
        }}
        hitSlop={8}
        accessibilityRole="button"
      >
        <Text className="text-lg text-accent font-body leading-[18px]">+</Text>
      </Pressable>
    </View>
  );
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

  const [editingMerkedager, setEditingMerkedager] = useState(false);
  const [merkedagerDraft, setMerkedagerDraft] = useState<RedLetterDayInput[]>([]);
  const [merkedagerSaving, setMerkedagerSaving] = useState(false);

  const [showFactInput, setShowFactInput] = useState(false);
  const [factDraft, setFactDraft] = useState("");
  const [editingFactIndex, setEditingFactIndex] = useState<number | null>(null);
  const [editingFactText, setEditingFactText] = useState("");
  const [factToDelete, setFactToDelete] = useState<number | null>(null);

  const [gatheringToDelete, setGatheringToDelete] = useState<string | null>(null);
  const [deletingGathering, setDeletingGathering] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  const savePerson = useCallback(
    async (patch: {
      displayName?: string;
      relationType?: string | null;
      birthday?: string | null;
      birthdayYearKnown?: boolean;
      funFacts?: string[];
      redLetterDays?: RedLetterDayInput[];
    }) => {
      if (!userId || !id || !bundle) return;
      const birthday = patch.birthday !== undefined ? patch.birthday : bundle.person.birthday;
      const yearKnown =
        patch.birthdayYearKnown !== undefined
          ? patch.birthdayYearKnown
          : bundle.person.birthdayYearKnown;
      const redLetterDays = mergeBirthdayRedLetterDay(
        patch.redLetterDays ?? mapRedLetterDays(bundle),
        birthday,
        yearKnown,
      );
      await updatePerson(userId, id, {
        displayName: patch.displayName ?? bundle.person.displayName,
        relationType:
          patch.relationType !== undefined ? patch.relationType : bundle.person.relationType,
        birthday,
        birthdayYearKnown: yearKnown,
        isSensitive: (bundle.person.sensitiveTopics ?? []).includes("handle_with_care"),
        funFacts: patch.funFacts ?? bundle.person.interests ?? [],
        redLetterDays,
      });
      reload();
    },
    [userId, id, bundle, reload],
  );

  const addMenuSections = useMemo((): AddMenuSection[] => {
    if (!id) return [];
    return [
      {
        title: t("people.personMenuSection"),
        actions: [
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

  const merkedagerDisplay = useMemo(() => {
    if (!bundle) return [];
    return bundle.redLetterDays.filter((d) => d.kind !== "Birthday");
  }, [bundle]);

  const openMerkedagerEditor = () => {
    if (!bundle) return;
    setMerkedagerDraft(mapRedLetterDays(bundle).filter((d) => d.kind !== "Birthday"));
    setEditingMerkedager(true);
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
  };

  const saveMerkedager = async () => {
    setMerkedagerSaving(true);
    try {
      await savePerson({ redLetterDays: merkedagerDraft });
      triggerMedium();
      setEditingMerkedager(false);
    } finally {
      setMerkedagerSaving(false);
    }
  };

  const saveFunFacts = async (facts: string[]) => {
    await savePerson({ funFacts: facts });
    triggerLight();
  };

  const submitFact = async () => {
    const trimmed = factDraft.trim();
    if (!trimmed || !bundle) return;
    await saveFunFacts([...(bundle.person.interests ?? []), trimmed]);
    setFactDraft("");
    setShowFactInput(false);
    Keyboard.dismiss();
  };

  const saveFactEdit = async (index: number) => {
    const trimmed = editingFactText.trim();
    setEditingFactIndex(null);
    setEditingFactText("");
    if (!trimmed || !bundle) return;
    const next = [...(bundle.person.interests ?? [])];
    next[index] = trimmed;
    await saveFunFacts(next);
  };

  const confirmRemoveFact = async () => {
    if (factToDelete === null || !bundle) return;
    const next = (bundle.person.interests ?? []).filter((_, i) => i !== factToDelete);
    setFactToDelete(null);
    await saveFunFacts(next);
    triggerMedium();
  };

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

  const handleDeleteGathering = async () => {
    if (!userId || !gatheringToDelete) return;
    setDeletingGathering(true);
    try {
      await deleteGathering(userId, gatheringToDelete);
      triggerMedium();
      setGatheringToDelete(null);
      reload();
    } finally {
      setDeletingGathering(false);
    }
  };

  const placeholderColor = colorScheme === "dark" ? "#7A8CAD" : "#A89E90";

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
          {bundle ? (
            <PersonProfileHeader
              displayName={bundle.person.displayName}
              relationType={bundle.person.relationType}
              birthday={bundle.person.birthday}
              birthdayYearKnown={bundle.person.birthdayYearKnown}
              monogram={
                <View
                  className={`w-16 h-16 rounded-full items-center justify-center ${monogramColor(bundle.person.displayName)}`}
                >
                  <Text className="text-xl text-card font-heading">
                    {initials(bundle.person.displayName)}
                  </Text>
                </View>
              }
              onSave={async (fields) => {
                await savePerson(fields);
              }}
            />
          ) : (
            <View className="flex-row items-center gap-4 pt-2 pb-4">
              <Text className="text-3xl leading-[36px] text-text1 font-heading">
                {t("people.personFallback")}
              </Text>
            </View>
          )}

          {loading ? (
            <Text className="text-body text-text3 font-body">{t("people.loadingProfile")}</Text>
          ) : null}
          {error ? <Text className="text-body text-red font-body">{error}</Text> : null}
          {!loading && !error && !bundle ? (
            <Text className="text-body text-text3 font-body">{t("people.notFound")}</Text>
          ) : null}

          {bundle ? (
            <>
              <SectionAddHeader
                title={t("people.redLetterDays")}
                onAdd={() => {
                  Keyboard.dismiss();
                  if (editingMerkedager) return;
                  openMerkedagerEditor();
                }}
              />
              {editingMerkedager ? (
                <Card style={{ marginBottom: 12 }}>
                  <RedLetterDaysSection
                    items={merkedagerDraft}
                    onChange={setMerkedagerDraft}
                    showSectionTitle={false}
                  />
                  <View className="flex-row gap-2 mt-3">
                    <Pressable
                      onPress={() => void saveMerkedager()}
                      disabled={merkedagerSaving}
                      className="flex-1 bg-accent rounded-lg py-2.5 items-center active:opacity-80"
                    >
                      <Text className="text-sm text-card font-bodySemi">
                        {merkedagerSaving ? t("personForm.saving") : t("people.saveProfile")}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerLight();
                        setEditingMerkedager(false);
                      }}
                      disabled={merkedagerSaving}
                      className="px-4 py-2.5 rounded-lg border border-border"
                    >
                      <Text className="text-sm text-text3 font-body">✕</Text>
                    </Pressable>
                  </View>
                </Card>
              ) : (
                <>
                  {merkedagerDisplay.length === 0 ? (
                    <Text className="text-body text-text3 font-body mb-3">
                      {t("people.noRedLetterDays")}
                    </Text>
                  ) : (
                    merkedagerDisplay.map((item) => (
                      <Card key={item.id} style={{ marginBottom: 4 }}>
                        <Text className="text-sm text-text1 font-bodyMedium">
                          {redLetterKindIcon(item.kind)}{" "}
                          {redLetterDisplayLabel(item.kind, item.label, locale)}
                        </Text>
                        <Text className="text-3xs text-text3 font-body mt-1">
                          {formatDate(item.eventDate, locale)}
                        </Text>
                      </Card>
                    ))
                  )}
                </>
              )}

              <SectionAddHeader
                title={t("people.funFacts")}
                onAdd={() => {
                  Keyboard.dismiss();
                  setShowFactInput(true);
                  setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
                }}
              />
              {(bundle.person.interests ?? []).map((fact, i) => {
                const isEditing = editingFactIndex === i;
                return (
                  <View
                    key={`${fact}-${i}`}
                    style={{ borderRadius: 12, overflow: "hidden", marginBottom: 4 }}
                  >
                    <Swipeable
                      friction={1.5}
                      overshootRight={false}
                      rightThreshold={40}
                      enabled={!isEditing}
                      renderRightActions={() => (
                        <SwipeEditDeleteActions
                          onEdit={() => {
                            setEditingFactText(fact);
                            setEditingFactIndex(i);
                          }}
                          onDelete={() => setFactToDelete(i)}
                        />
                      )}
                    >
                      <Card>
                        {isEditing ? (
                          <TextInput
                            value={editingFactText}
                            onChangeText={setEditingFactText}
                            autoFocus
                            multiline
                            returnKeyType="done"
                            onBlur={() => void saveFactEdit(i)}
                            onSubmitEditing={() => void saveFactEdit(i)}
                            className="text-sm text-text1 font-body bg-transparent"
                            style={{ minHeight: 24 }}
                          />
                        ) : (
                          <Text className="text-sm text-text2 font-body leading-[21px]">
                            · {fact}
                          </Text>
                        )}
                      </Card>
                    </Swipeable>
                  </View>
                );
              })}
              {(bundle.person.interests ?? []).length === 0 && !showFactInput ? (
                <Text className="text-body text-text3 font-body mb-2">{t("people.noFunFacts")}</Text>
              ) : null}
              {showFactInput ? (
                <Card style={{ marginBottom: 12 }}>
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={factDraft}
                      onChangeText={setFactDraft}
                      placeholder={t("personForm.funFactsPlaceholder")}
                      placeholderTextColor={placeholderColor}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={() => void submitFact()}
                      className="flex-1 bg-bg2 border border-border rounded-md px-3 text-sm text-text1 font-body"
                      style={{ paddingVertical: 10, minHeight: 44 }}
                    />
                    <Pressable
                      onPress={() => void submitFact()}
                      hitSlop={8}
                      className="w-10 h-10 rounded-full bg-accent items-center justify-center active:opacity-70"
                    >
                      <Text className="text-base text-card font-bodySemi">✓</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        triggerLight();
                        setShowFactInput(false);
                        setFactDraft("");
                        Keyboard.dismiss();
                      }}
                      hitSlop={8}
                      className="p-1"
                    >
                      <Text className="text-body-lg text-text3">✕</Text>
                    </Pressable>
                  </View>
                </Card>
              ) : null}

              <SectionAddHeader
                title={t("people.events")}
                onAdd={() => {
                  Keyboard.dismiss();
                  router.push(`/gather/new?personId=${id}`);
                }}
              />
              {bundle.gatherings.length === 0 ? (
                <Text className="text-body text-text3 font-body mb-2">{t("people.noEvents")}</Text>
              ) : (
                bundle.gatherings.map((g) => (
                  <View
                    key={g.id}
                    style={{ borderRadius: 12, overflow: "hidden", marginBottom: 4 }}
                  >
                    <Swipeable
                      friction={1.5}
                      overshootRight={false}
                      rightThreshold={40}
                      renderRightActions={() => (
                        <SwipeEditDeleteActions
                          onEdit={() => {
                            triggerSelection();
                            router.push(`/gather/${g.id}`);
                          }}
                          onDelete={() => setGatheringToDelete(g.id)}
                        />
                      )}
                    >
                      <Pressable
                        onPress={() => {
                          triggerLight();
                          router.push(`/gather/${g.id}`);
                        }}
                      >
                        <Card>
                          <Text className="text-sm text-text1 font-bodyMedium">{g.title}</Text>
                          {g.scheduledAt ? (
                            <Text className="text-3xs text-text3 font-body mt-1">
                              {formatDate(g.scheduledAt.toISOString(), locale)}
                            </Text>
                          ) : null}
                        </Card>
                      </Pressable>
                    </Swipeable>
                  </View>
                ))
              )}

              {bundle.links.length > 0 ? (
                <>
                  <SectionLabel>{t("people.relationships")}</SectionLabel>
                  {bundle.links.map((link) => (
                    <Link key={link.id} href={`/people/${link.otherPersonId}`} asChild>
                      <Pressable>
                        <Card style={{ marginBottom: 4 }}>
                          <Text className="text-sm text-text1 font-bodyMedium">
                            {link.otherPersonName}
                          </Text>
                          <Text className="text-xs text-text3 font-body mt-1">{link.label}</Text>
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
                  <View
                    key={entry.id}
                    style={{ borderRadius: 12, overflow: "hidden", marginBottom: 8 }}
                  >
                    <Swipeable
                      friction={1.5}
                      overshootRight={false}
                      rightThreshold={40}
                      enabled={!isEditing}
                      renderRightActions={() => (
                        <SwipeEditDeleteActions
                          onEdit={() => {
                            setEditingEntryText(entry.body);
                            setEditingEntryId(entry.id);
                          }}
                          onDelete={() => setEntryToDelete(entry.id)}
                        />
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
                          <Text className="text-body-lg text-text1 font-body mt-1">
                            {entry.body}
                          </Text>
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
                      placeholderTextColor={placeholderColor}
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
                      onPress={() => {
                        triggerLight();
                        setShowNoteInput(false);
                        setEntryBody("");
                        setEntryError(null);
                        Keyboard.dismiss();
                      }}
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
        visible={factToDelete !== null}
        onDismiss={() => setFactToDelete(null)}
        title={t("people.removeFunFactTitle")}
      >
        <Text className="text-sm text-text2 font-body mb-4">{t("people.removeFunFactBody")}</Text>
        <View className="gap-2">
          <Button variant="primary" onPress={() => void confirmRemoveFact()}>
            {t("common.remove")}
          </Button>
          <Button variant="ghost" onPress={() => setFactToDelete(null)}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={gatheringToDelete !== null}
        onDismiss={() => setGatheringToDelete(null)}
        title={t("gathering.deleteEvent")}
      >
        <Text className="text-sm text-text2 font-body mb-4">{t("gathering.deleteEventBody")}</Text>
        <View className="gap-2">
          <Button
            variant="primary"
            onPress={() => void handleDeleteGathering()}
            loading={deletingGathering}
            disabled={deletingGathering}
          >
            {t("common.delete")}
          </Button>
          <Button
            variant="ghost"
            onPress={() => setGatheringToDelete(null)}
            disabled={deletingGathering}
          >
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
