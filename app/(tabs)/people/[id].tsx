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
import { MerkedagComposer } from "@/features/people/MerkedagComposer";
import { PersonProfileHeader } from "@/features/people/PersonProfileHeader";
import { SwipeEditDeleteActions } from "@/features/people/SwipeEditDeleteActions";
import { usePersonProfileData } from "@/features/people/usePersonProfileData";
import { useTranslation } from "@/i18n/LanguageContext";
import { redLetterKindIcon } from "@/i18n/redLetterKinds";
import type { Locale } from "@/i18n/types";
import {
  RED_LETTER_OTHER_KINDS,
  type RedLetterDayInput,
  type RedLetterKind,
} from "@/lib/red-letter-day";
import { formatPersonMerkedagLine } from "@/lib/people/personMerkedagDisplay";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import type { AddMenuSection } from "@/ui/GlobalAddButton";
import { InputActionButtons } from "@/ui/InputActionButtons";
import { PersonDetailListRow } from "@/ui/PersonDetailListRow";
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

type MerkedagListItem = {
  id?: string;
  kind: RedLetterKind;
  label: string | null;
  eventDate: string;
  yearKnown: boolean;
  recurring: boolean;
};

function buildMerkedagerList(
  bundle: NonNullable<ReturnType<typeof usePersonProfileData>["bundle"]>,
): MerkedagListItem[] {
  const birthdayRow = bundle.redLetterDays.find((d) => d.kind === "Birthday");
  const others = bundle.redLetterDays.filter((d) => d.kind !== "Birthday");
  const rows: MerkedagListItem[] = [];

  if (birthdayRow) {
    rows.push({
      id: birthdayRow.id,
      kind: "Birthday",
      label: birthdayRow.label,
      eventDate: birthdayRow.eventDate,
      yearKnown: birthdayRow.yearKnown,
      recurring: birthdayRow.recurring,
    });
  } else if (bundle.person.birthday) {
    rows.push({
      kind: "Birthday",
      label: null,
      eventDate: bundle.person.birthday,
      yearKnown: bundle.person.birthdayYearKnown,
      recurring: true,
    });
  }

  for (const d of others) {
    rows.push({
      id: d.id,
      kind: d.kind as RedLetterKind,
      label: d.label,
      eventDate: d.eventDate,
      yearKnown: d.yearKnown,
      recurring: d.recurring,
    });
  }
  return rows;
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

const ADD_ROW_CLASS = "flex-row items-center gap-2 py-1.5 active:opacity-60";

function SectionAddHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <View className="flex-row items-center justify-between mt-3 mb-1">
      <Text className="text-3xs uppercase tracking-[1.92px] text-text3 font-bodySemi">{title}</Text>
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

  const [showMerkedagComposer, setShowMerkedagComposer] = useState(false);
  const [merkedagEditInitial, setMerkedagEditInitial] = useState<RedLetterDayInput | undefined>();
  const [composerBirthdayOnly, setComposerBirthdayOnly] = useState(false);

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

  const merkedagerList = useMemo(
    () => (bundle ? buildMerkedagerList(bundle) : []),
    [bundle],
  );

  const merkedagerOtherKinds = useMemo(
    () => merkedagerList.filter((d) => d.kind !== "Birthday").map((d) => d.kind),
    [merkedagerList],
  );

  const hasBirthday = merkedagerList.some((d) => d.kind === "Birthday");

  const canAddMerkedag = merkedagerOtherKinds.length < RED_LETTER_OTHER_KINDS.length;

  const openMerkedagComposer = (item?: MerkedagListItem, birthdayOnly = false) => {
    setComposerBirthdayOnly(birthdayOnly);
    if (item) {
      setMerkedagEditInitial({
        id: item.id,
        kind: item.kind,
        label: item.label,
        eventDate: item.eventDate,
        yearKnown: item.yearKnown,
        recurring: item.recurring,
      });
    } else {
      setMerkedagEditInitial(undefined);
    }
    setShowMerkedagComposer(true);
  };

  const dismissMerkedagComposer = () => {
    setShowMerkedagComposer(false);
    setMerkedagEditInitial(undefined);
    setComposerBirthdayOnly(false);
    Keyboard.dismiss();
  };

  const confirmMerkedag = async (day: RedLetterDayInput) => {
    if (!bundle) return;
    const withoutKind = mapRedLetterDays(bundle).filter((d) => d.kind !== day.kind);
    const nextDays = [...withoutKind, day];
    if (day.kind === "Birthday") {
      await savePerson({
        birthday: day.eventDate,
        birthdayYearKnown: day.yearKnown,
        redLetterDays: nextDays,
      });
    } else {
      await savePerson({ redLetterDays: nextDays });
    }
    triggerMedium();
    dismissMerkedagComposer();
  };

  const deleteMerkedagItem = async (item: MerkedagListItem) => {
    if (!bundle) return;
    if (item.kind === "Birthday") {
      await savePerson({
        birthday: null,
        redLetterDays: mapRedLetterDays(bundle).filter((d) => d.kind !== "Birthday"),
      });
    } else {
      const next = mapRedLetterDays(bundle).filter(
        (d) => d.kind !== "Birthday" && d.id !== item.id,
      );
      await savePerson({ redLetterDays: next });
    }
    triggerMedium();
    dismissMerkedagComposer();
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }}
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
              <SectionLabel compact>{t("people.redLetterDays")}</SectionLabel>
              <View className="border-t border-border">
                {merkedagerList.map((item) => {
                  const rowKey = item.id ?? `kind-${item.kind}`;
                  const line = formatPersonMerkedagLine(
                    item.kind,
                    item.label,
                    item.eventDate,
                    locale,
                  );
                  return (
                    <View key={rowKey} style={{ overflow: "hidden" }}>
                      <Swipeable
                        friction={1.5}
                        overshootRight={false}
                        rightThreshold={40}
                        enabled={!showMerkedagComposer}
                        renderRightActions={() => (
                          <SwipeEditDeleteActions
                            onEdit={() => {
                              triggerSelection();
                              openMerkedagComposer(item, item.kind === "Birthday");
                            }}
                            onDelete={() => void deleteMerkedagItem(item)}
                          />
                        )}
                      >
                        <PersonDetailListRow icon={redLetterKindIcon(item.kind)}>
                          <Text className="text-body-lg text-text1 font-body">{line}</Text>
                        </PersonDetailListRow>
                      </Swipeable>
                    </View>
                  );
                })}
              </View>
              {merkedagerList.length === 0 && !showMerkedagComposer ? (
                <Text className="text-body text-text3 font-body mb-1">
                  {t("people.noRedLetterDays")}
                </Text>
              ) : null}
              {showMerkedagComposer ? (
                <View className="mb-2">
                  <MerkedagComposer
                    initial={merkedagEditInitial}
                    birthdayOnly={composerBirthdayOnly}
                    usedKinds={merkedagerList
                      .map((d) => d.kind)
                      .filter((k) => k !== merkedagEditInitial?.kind)}
                    onConfirm={(day) => void confirmMerkedag(day)}
                    onDismiss={dismissMerkedagComposer}
                    onDelete={
                      merkedagEditInitial
                        ? () =>
                            void deleteMerkedagItem({
                              id: merkedagEditInitial.id,
                              kind: merkedagEditInitial.kind,
                              label: merkedagEditInitial.label ?? null,
                              eventDate: merkedagEditInitial.eventDate,
                              yearKnown: merkedagEditInitial.yearKnown ?? true,
                              recurring: merkedagEditInitial.recurring ?? true,
                            })
                        : undefined
                    }
                  />
                </View>
              ) : null}
              {!hasBirthday && !showMerkedagComposer ? (
                <Pressable
                  onPress={() => {
                    triggerLight();
                    openMerkedagComposer(undefined, true);
                  }}
                  className={ADD_ROW_CLASS}
                >
                  <Text className="text-xl text-accent font-body">+</Text>
                  <Text className="text-body text-text3 font-body">
                    {t("people.addBirthday")}
                  </Text>
                </Pressable>
              ) : null}
              {canAddMerkedag && !showMerkedagComposer ? (
                <Pressable
                  onPress={() => {
                    triggerLight();
                    openMerkedagComposer();
                  }}
                  className={ADD_ROW_CLASS}
                >
                  <Text className="text-xl text-accent font-body">+</Text>
                  <Text className="text-body text-text3 font-body">{t("redLetter.add")}</Text>
                </Pressable>
              ) : null}

              <SectionLabel compact>{t("people.funFacts")}</SectionLabel>
              <View className="border-t border-border">
                {(bundle.person.interests ?? []).map((fact, i) => {
                  const isEditing = editingFactIndex === i;
                  return (
                    <View key={`${fact}-${i}`} style={{ overflow: "hidden" }}>
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
                        <PersonDetailListRow>
                          {isEditing ? (
                            <TextInput
                              value={editingFactText}
                              onChangeText={setEditingFactText}
                              autoFocus
                              multiline
                              returnKeyType="done"
                              onBlur={() => void saveFactEdit(i)}
                              onSubmitEditing={() => void saveFactEdit(i)}
                              className="text-body-lg text-text1 font-body bg-transparent"
                              style={{ minHeight: 24, fontSize: 17 }}
                            />
                          ) : (
                            <Text className="text-body-lg text-text1 font-body">{fact}</Text>
                          )}
                        </PersonDetailListRow>
                      </Swipeable>
                    </View>
                  );
                })}
              </View>
              {(bundle.person.interests ?? []).length === 0 && !showFactInput ? (
                <Text className="text-body text-text3 font-body mb-1">{t("people.noFunFacts")}</Text>
              ) : null}
              {!showFactInput ? (
                <Pressable
                  onPress={() => {
                    triggerLight();
                    setShowFactInput(true);
                  }}
                  className={ADD_ROW_CLASS}
                >
                  <Text className="text-xl text-accent font-body">+</Text>
                  <Text className="text-body text-text3 font-body">{t("people.addFunFact")}</Text>
                </Pressable>
              ) : (
                <View className="flex-row items-start gap-3 mt-1 mb-2 py-1">
                  <TextInput
                    value={factDraft}
                    onChangeText={setFactDraft}
                    placeholder={t("personForm.funFactsPlaceholder")}
                    placeholderTextColor={placeholderColor}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={() => void submitFact()}
                    className="flex-1 bg-bg2 border border-border rounded-md px-3 text-sm text-text1 font-body"
                    style={{ paddingVertical: 12, minHeight: 48 }}
                  />
                  <InputActionButtons
                    onConfirm={() => void submitFact()}
                    onDismiss={() => {
                      setShowFactInput(false);
                      setFactDraft("");
                      Keyboard.dismiss();
                    }}
                  />
                </View>
              )}

              <SectionAddHeader
                title={t("people.events")}
                onAdd={() => {
                  Keyboard.dismiss();
                  router.push(`/gather/new?personId=${id}`);
                }}
              />
              {bundle.gatherings.length === 0 ? (
                <Text className="text-body text-text3 font-body mb-1">{t("people.noEvents")}</Text>
              ) : (
                <View className="border-t border-border">
                  {bundle.gatherings.map((g) => {
                    const eventLine = g.scheduledAt
                      ? `${g.title} · ${formatDate(g.scheduledAt.toISOString(), locale)}`
                      : g.title;
                    return (
                      <View key={g.id} style={{ overflow: "hidden" }}>
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
                            className="active:opacity-80"
                          >
                            <PersonDetailListRow icon="🌿">
                              <Text className="text-body-lg text-text1 font-body">{eventLine}</Text>
                            </PersonDetailListRow>
                          </Pressable>
                        </Swipeable>
                      </View>
                    );
                  })}
                </View>
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

              <SectionLabel compact>{t("people.followUpsTitle")}</SectionLabel>
              {bundle.timeline.map((entry) => {
                const isEditing = editingEntryId === entry.id;
                return (
                  <View
                    key={entry.id}
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
                            setEditingEntryText(entry.body);
                            setEditingEntryId(entry.id);
                          }}
                          onDelete={() => setEntryToDelete(entry.id)}
                        />
                      )}
                    >
                      <View className="border-l-2 border-accent pl-3 py-2.5 bg-bg">
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
                <Text className="text-body text-text3 font-body mb-1">{t("people.noFollowUps")}</Text>
              ) : null}

              {!showNoteInput ? (
                <Pressable
                  onPress={() => {
                    triggerLight();
                    setShowNoteInput(true);
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
                  }}
                  className={`${ADD_ROW_CLASS} mb-2`}
                >
                  <Text className="text-xl text-accent font-body">+</Text>
                  <Text className="text-body text-text3 font-body">{t("people.addFollowUp")}</Text>
                </Pressable>
              ) : (
                <Card style={{ marginBottom: 8 }}>
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
