import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useCallback, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import {
  addGatheringParticipant,
  deleteGathering,
  getGathering,
  updateGatheringContent,
  updateGatheringTitle,
} from "@/db/repos/gatheringsRepo";
import { listPeopleSummaries } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { useTranslation } from "@/i18n";
import type { Locale } from "@/i18n/types";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";
import {
  parseGatheringContent,
  TALKING_POINT_KINDS,
  talkingPointLabel,
  talkingPointMeta,
  type GatheringContent,
  type TalkingPoint,
  type TalkingPointKind,
} from "@/lib/gatherings/talkingPoints";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { Button } from "@/ui/Button";
import { IconButton } from "@/ui/IconButton";

function formatDate(date: Date | null, locale: Locale) {
  if (!date) return null;
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  return date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function GatheringDetailScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const colorScheme = useColorScheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState<GatheringContent>({ talkingPoints: [] });
  const [participants, setParticipants] = useState<{ personId: string; displayName: string }[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKind, setSelectedKind] = useState<TalkingPointKind>("topic");
  const [newPointText, setNewPointText] = useState("");
  const [showKindPicker, setShowKindPicker] = useState(false);
  const [showInputField, setShowInputField] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [allPeople, setAllPeople] = useState<{ id: string; displayName: string }[]>([]);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(async () => {
    if (!userId || !id) return;
    setLoading(true);
    try {
      const data = await getGathering(userId, id);
      if (!data) {
        setTitle("");
        setContent({ talkingPoints: [] });
        setParticipants([]);
        return;
      }
      setTitle(data.gathering.title);
      setContent(parseGatheringContent(data.gathering.description));
      setParticipants(data.participants);
      setScheduledAt(data.gathering.scheduledAt);
    } finally {
      setLoading(false);
    }
  }, [userId, id]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      if (userId) {
        listPeopleSummaries(userId).then((rows) =>
          setAllPeople(rows.map((p) => ({ id: p.id, displayName: p.displayName }))),
        );
      }
      return () => {
        Keyboard.dismiss();
        setShowKindPicker(false);
      };
    }, [reload, userId]),
  );

  async function persistContent(next: GatheringContent) {
    if (!userId || !id) return;
    setContent(next);
    await updateGatheringContent(userId, id, next);
  }

  async function saveTitle(next: string) {
    if (!userId || !id) return;
    const trimmed = next.trim();
    if (!trimmed) return;
    setTitle(trimmed);
    await updateGatheringTitle(userId, id, trimmed);
  }

  function toggleDone(pointId: string) {
    triggerSelection();
    const next = {
      talkingPoints: content.talkingPoints.map((p) =>
        p.id === pointId ? { ...p, done: !p.done } : p,
      ),
    };
    void persistContent(next);
  }

  function removePoint(pointId: string) {
    triggerLight();
    LayoutAnimation.configureNext({
      duration: 300,
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    void persistContent({
      talkingPoints: content.talkingPoints.filter((p) => p.id !== pointId),
    });
  }

  async function addPoint() {
    const text = newPointText.trim();
    if (!text) return;

    Keyboard.dismiss();
    triggerMedium();
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 0.7,
      },
    });
    const point: TalkingPoint = {
      id: Crypto.randomUUID(),
      kind: selectedKind,
      text,
      done: false,
    };
    setNewPointText("");
    setShowInputField(false);
    await persistContent({ talkingPoints: [...content.talkingPoints, point] });
  }

  function handlePlusPress() {
    triggerLight();

    // If text exists, add the point
    if (newPointText.trim()) {
      void addPoint();
      return;
    }

    // If input visible but empty, hide it
    if (showInputField) {
      LayoutAnimation.configureNext({
        duration: 200,
        delete: {
          type: LayoutAnimation.Types.easeInEaseOut,
          property: LayoutAnimation.Properties.opacity,
        },
      });
      setShowInputField(false);
      setShowKindPicker(false);
      return;
    }

    // Otherwise open kind picker
    LayoutAnimation.configureNext({
      duration: 250,
      create: {
        type: LayoutAnimation.Types.spring,
        property: LayoutAnimation.Properties.opacity,
        springDamping: 0.7,
      },
    });
    setShowKindPicker(true);
  }

  async function handleAddParticipant(personId: string) {
    if (!userId || !id) return;
    if (participants.some((p) => p.personId === personId)) {
      setShowPersonPicker(false);
      return;
    }
    await addGatheringParticipant(userId, id, personId);
    setShowPersonPicker(false);
    await reload();
  }

  async function handleDelete() {
    if (!userId || !id) return;
    setDeleting(true);
    try {
      await deleteGathering(userId, id);
      triggerMedium();
      setShowDelete(false);
      Keyboard.dismiss();
      router.replace("/gather");
    } finally {
      setDeleting(false);
    }
  }

  const dateLabel = formatDate(scheduledAt, locale);
  const placeholderColor = colorScheme === "dark" ? "#7A8CAD" : "#A89E90";
  const inputTextColor = colorScheme === "dark" ? "#E8E4DC" : "#1C1915";
  const displayTitle = id ? localizeGatheringTitle(id, title, locale) : title;
  const participantIds = new Set(participants.map((p) => p.personId));
  const personReturnTo = id ? `/gather/${id}` : undefined;

  return (
    <AppShell>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "transparent" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View className="flex-1 px-4">
          <View className="flex-row items-center justify-between pt-1 pb-2">
            <Pressable
              onPress={() => {
                triggerLight();
                Keyboard.dismiss();
                router.back();
              }}
              hitSlop={12}
              accessibilityLabel="Back"
            >
              <Text className="text-[20px] text-accent font-body">←</Text>
            </Pressable>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => { triggerLight(); setShowPersonPicker(true); }}
                className="w-8 h-8 rounded-full bg-green items-center justify-center"
                hitSlop={8}
                accessibilityLabel={t("gathering.addPerson")}
              >
                <Text className="text-[16px] text-card font-body leading-[18px]">+</Text>
              </Pressable>
              <Pressable
                onPress={() => { triggerLight(); setEditingTitle(true); }}
                className="w-8 h-8 rounded-full bg-amber items-center justify-center"
                hitSlop={8}
                accessibilityLabel={t("people.editPersonA11y")}
              >
                <Text className="text-[15px] text-card font-body">✎</Text>
              </Pressable>
              <Pressable
                onPress={() => { triggerLight(); setShowDelete(true); }}
                className="w-8 h-8 rounded-full bg-red items-center justify-center"
                hitSlop={8}
                accessibilityLabel={t("gathering.deleteEvent")}
              >
                <Text className="text-[15px] text-card font-body">✕</Text>
              </Pressable>
            </View>
          </View>

          {loading ? (
            <Text className="text-[13px] text-text3 font-body">{t("common.loading")}</Text>
          ) : !title && content.talkingPoints.length === 0 ? (
            <Text className="text-[13px] text-text3 font-body">{t("gathering.notFound")}</Text>
          ) : (
            <>
              <View className="flex-row items-start gap-2 mb-2">
                {editingTitle ? (
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    blurOnSubmit
                    returnKeyType="done"
                    onBlur={() => {
                      setEditingTitle(false);
                      void saveTitle(title);
                    }}
                    placeholderTextColor={placeholderColor}
                    style={{ color: inputTextColor }}
                    className="flex-1 text-[28px] leading-[34px] text-text1 font-heading border-b border-accent pb-1 bg-transparent"
                  />
                ) : (
                  <Text className="text-[28px] leading-[34px] text-text1 font-heading flex-1">{displayTitle}</Text>
                )}
              </View>

              <View className="flex-row flex-wrap gap-2 mb-3">
                {participants.map((p) => (
                  <Link
                    key={p.personId}
                    href={
                      personReturnTo
                        ? { pathname: "/people/[id]", params: { id: p.personId, returnTo: personReturnTo } }
                        : `/people/${p.personId}`
                    }
                    asChild
                  >
                    <Pressable className="px-3 py-1.5 rounded-full bg-bg2 border border-border">
                      <Text className="text-[12px] text-text2 font-body">{p.displayName}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>

              {dateLabel ? (
                <Text className="text-[11px] text-text3 font-body mb-3">{dateLabel}</Text>
              ) : null}

              <ScrollView
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
                style={{ flex: 1 }}
              >
                {content.talkingPoints.length === 0 ? (
                  <View className="mb-4">
                    <Text className="text-[14px] text-text2 font-body">{t("gathering.noTalkingPoints")}</Text>
                    <Text className="text-[13px] text-text3 font-body mt-1">
                      {t("gathering.noTalkingPointsSub")}
                    </Text>
                  </View>
                ) : (
                  TALKING_POINT_KINDS.map((kind) => {
                    const items = content.talkingPoints.filter((p) => p.kind === kind);
                    if (items.length === 0) return null;
                    const meta = talkingPointMeta(kind);
                    return (
                      <View key={kind} className="mb-3">
                        <Text className="text-[11px] uppercase tracking-wide text-text3 font-bodySemi mb-1">
                          {meta.icon} {talkingPointLabel(kind, locale)}
                        </Text>
                        {items.map((point) => (
                          <BriefCard key={point.id} stripeColor={meta.stripeColor}>
                            <View className="flex-row items-start gap-2">
                              <Pressable onPress={() => toggleDone(point.id)} className="flex-1">
                                <Text
                                  className={`text-[15px] text-text1 font-body ${
                                    point.done ? "opacity-50 line-through" : ""
                                  }`}
                                >
                                  {point.text}
                                </Text>
                              </Pressable>
                              <Pressable onPress={() => removePoint(point.id)} hitSlop={8}>
                                <Text className="text-[14px] text-text3 font-body">✕</Text>
                              </Pressable>
                            </View>
                          </BriefCard>
                        ))}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View style={{ backgroundColor: "transparent" }} className="border-t border-border pt-3 pb-4">
                {showKindPicker ? (
                  <Pressable
                    onPress={() => setShowKindPicker(false)}
                    className="absolute inset-0 z-10"
                  />
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
                  {showInputField ? (
                    <TextInput
                      value={newPointText}
                      onChangeText={setNewPointText}
                      placeholder={t("gathering.addPlaceholder")}
                      placeholderTextColor={placeholderColor}
                      returnKeyType="done"
                      onSubmitEditing={() => void addPoint()}
                      style={{ color: inputTextColor, flex: 1 }}
                      className="bg-bg2 border border-border rounded-lg px-3 py-2.5 text-[15px] text-text1 font-body"
                      autoFocus
                    />
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <View className="relative items-end">
                    {showKindPicker ? (
                      <View
                        className="absolute bottom-11 right-0 rounded-xl border border-border bg-card py-1.5 px-1 gap-1 min-w-[148px] z-20"
                        style={{
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: -2 },
                          shadowOpacity: 0.12,
                          shadowRadius: 8,
                          elevation: 4,
                        }}
                      >
                        {TALKING_POINT_KINDS.map((kind) => {
                          const meta = talkingPointMeta(kind);
                          const active = selectedKind === kind;
                          return (
                            <Pressable
                              key={kind}
                              onPress={() => {
                                triggerSelection();
                                setSelectedKind(kind);
                                LayoutAnimation.configureNext({
                                  duration: 250,
                                  delete: {
                                    type: LayoutAnimation.Types.easeInEaseOut,
                                    property: LayoutAnimation.Properties.opacity,
                                  },
                                  create: {
                                    type: LayoutAnimation.Types.spring,
                                    property: LayoutAnimation.Properties.opacity,
                                    springDamping: 0.7,
                                  },
                                });
                                setShowKindPicker(false);
                                setShowInputField(true);
                              }}
                              className={`flex-row items-center gap-2 px-3 py-2 rounded-lg ${
                                active ? "bg-accent" : "bg-transparent"
                              }`}
                            >
                              <Text className="text-[13px] leading-[16px]">{meta.icon}</Text>
                              <Text
                                className={`text-[12px] font-bodyMedium leading-[16px] ${
                                  active ? "text-card" : "text-text2"
                                }`}
                              >
                                {talkingPointLabel(kind, locale)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    <Pressable
                      onPress={handlePlusPress}
                      accessibilityRole="button"
                      accessibilityLabel={t("gathering.addPlaceholder")}
                      className="w-10 h-10 rounded-lg bg-accent items-center justify-center active:opacity-80"
                    >
                      <Text className="text-[20px] text-card font-body leading-[22px]">+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={showDelete} onDismiss={() => setShowDelete(false)} title={t("gathering.deleteEvent")}>
        <Text className="text-[14px] text-text2 font-body mb-4">{t("gathering.deleteEventBody")}</Text>
        <View className="gap-2">
          <Button variant="primary" onPress={() => void handleDelete()} loading={deleting} disabled={deleting}>
            {t("common.delete")}
          </Button>
          <Button variant="ghost" onPress={() => setShowDelete(false)} disabled={deleting}>
            {t("common.cancel")}
          </Button>
        </View>
      </BottomSheet>

      <BottomSheet
        visible={showPersonPicker}
        onDismiss={() => setShowPersonPicker(false)}
        title={t("gathering.pickPerson")}
      >
        <View className="gap-2">
          {allPeople
            .filter((p) => !participantIds.has(p.id))
            .map((p) => (
              <Pressable
                key={p.id}
                onPress={() => void handleAddParticipant(p.id)}
                className="py-2 border-b border-border"
              >
                <Text className="text-[15px] text-text1 font-body">{p.displayName}</Text>
              </Pressable>
            ))}
        </View>
      </BottomSheet>
    </AppShell>
  );
}
