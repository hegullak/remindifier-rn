import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import type { AddMenuSection } from "@/ui/GlobalAddButton";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { Button } from "@/ui/Button";

const COMPOSER_KIND_ORDER: TalkingPointKind[] = ["topic", "question", "smalltalk", "headsup"];

function formatDateTime(date: Date | null, locale: Locale) {
  if (!date) return null;
  const dateLocale = locale === "no" ? "nb-NO" : "en-GB";
  const datePart = date.toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const timePart = date.toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { datePart, timePart, combined: `${datePart} · ${timePart}` };
}

export default function GatheringDetailScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const [title, setTitle] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState<GatheringContent>({ talkingPoints: [] });
  const [participants, setParticipants] = useState<{ personId: string; displayName: string }[]>([]);
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedKind, setSelectedKind] = useState<TalkingPointKind>("topic");
  const [newPointText, setNewPointText] = useState("");
  const pointInputRef = useRef<TextInput>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [showPersonPicker, setShowPersonPicker] = useState(false);
  const [showCreatedBanner, setShowCreatedBanner] = useState(created === "1");
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
      };
    }, [reload, userId]),
  );

  const addMenuSections = useMemo((): AddMenuSection[] => {
    return [
      {
        title: t("gathering.eventMenuSection"),
        actions: [
          {
            icon: "✎",
            bgClass: "bg-amber-light",
            label: t("gathering.editDetails"),
            onPress: () => {
              setTimeout(() => {
                if (mountedRef.current) setEditingTitle(true);
              }, 300);
            },
          },
          {
            icon: "👤",
            bgClass: "bg-green-light",
            label: t("gathering.addPerson"),
            onPress: () => {
              setTimeout(() => {
                if (mountedRef.current) setShowPersonPicker(true);
              }, 300);
            },
          },
          {
            icon: "🗑",
            bgClass: "bg-red-light",
            label: t("gathering.deleteEvent"),
            destructive: true,
            onPress: () => {
              setTimeout(() => {
                if (mountedRef.current) setShowDelete(true);
              }, 300);
            },
          },
        ],
      },
    ];
  }, [t]);

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
    await persistContent({ talkingPoints: [...content.talkingPoints, point] });
    setTimeout(() => pointInputRef.current?.focus(), 100);
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

  const dateTime = formatDateTime(scheduledAt, locale);
  const placeholderColor = isDark ? "#7A8CAD" : "#A89E90";
  const inputTextColor = isDark ? "#EEF0F5" : "#1C1915";
  const inputBgColor = isDark ? "#222838" : "#EFECE3";
  const inputBorderColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)";
  const displayTitle = id ? localizeGatheringTitle(id, title, locale) : title;
  const participantIds = new Set(participants.map((p) => p.personId));
  const personReturnTo = id ? `/gather/${id}` : undefined;
  const selectedMeta = talkingPointMeta(selectedKind);

  return (
    <AppShell
      addMenuSections={addMenuSections}
      headerLeft={
        <Pressable
          onPress={() => { triggerLight(); Keyboard.dismiss(); router.back(); }}
          hitSlop={12}
          accessibilityLabel="Back"
        >
          <Text className="text-xl text-accent font-body">←</Text>
        </Pressable>
      }
    >
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: "transparent" }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <View className="flex-1 px-4">

          {loading ? (
            <Text className="text-body text-text3 font-body">{t("common.loading")}</Text>
          ) : !title && content.talkingPoints.length === 0 ? (
            <Text className="text-body text-text3 font-body">{t("gathering.notFound")}</Text>
          ) : (
            <>
              {showCreatedBanner ? (
                <View className="mb-2 flex-row items-center gap-2 rounded-lg border border-border bg-bg2 px-3 py-2">
                  <Text className="text-sm text-sage font-bodySemi shrink">
                    ✓ {t("gathering.createdTitle")}
                  </Text>
                  {content.talkingPoints.length > 0 ? (
                    <Text className="text-3xs text-text3 font-body shrink">
                      · {t("gathering.createdSubtitle", { count: content.talkingPoints.length })}
                    </Text>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      triggerLight();
                      setShowCreatedBanner(false);
                    }}
                    hitSlop={8}
                    accessibilityLabel="Dismiss"
                    className="ml-auto px-1"
                  >
                    <Text className="text-sm text-text3 font-body">✕</Text>
                  </Pressable>
                </View>
              ) : null}

              <View className="flex-row items-start gap-2 mb-2">
                {editingTitle ? (
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    blurOnSubmit
                    returnKeyType="done"
                    autoFocus
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
                      <Text className="text-xs text-text2 font-body">{p.displayName}</Text>
                    </Pressable>
                  </Link>
                ))}
              </View>

              {dateTime ? (
                <View className="mb-3">
                  <Text className="text-body text-text1 font-bodyMedium">{dateTime.datePart}</Text>
                  <Text className="text-xl text-accent font-bodySemi mt-0.5">{dateTime.timePart}</Text>
                </View>
              ) : null}

              <ScrollView
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ paddingBottom: 8, flexGrow: 1 }}
                style={{ flex: 1 }}
              >
                {content.talkingPoints.length === 0 ? (
                  <View className="mb-4">
                    <Text className="text-sm text-text2 font-body">{t("gathering.noTalkingPoints")}</Text>
                    <Text className="text-body text-text3 font-body mt-1">
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
                        <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
                          {meta.icon} {talkingPointLabel(kind, locale)}
                        </Text>
                        {items.map((point) => (
                          <BriefCard key={point.id} stripeColor={meta.stripeColor}>
                            <View className="flex-row items-start gap-2">
                              <Pressable onPress={() => toggleDone(point.id)} className="flex-1">
                                <Text
                                  className={`text-body-lg text-text1 font-body ${
                                    point.done ? "opacity-50 line-through" : ""
                                  }`}
                                >
                                  {point.text}
                                </Text>
                              </Pressable>
                              <Pressable onPress={() => removePoint(point.id)} hitSlop={8}>
                                <Text className="text-sm text-text3 font-body">✕</Text>
                              </Pressable>
                            </View>
                          </BriefCard>
                        ))}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <View
                className="border-t border-border bg-bg pt-3 -mx-4 px-4"
                style={{ paddingBottom: 100 }}
              >
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
                  className="mb-1"
                >
                  {COMPOSER_KIND_ORDER.map((kind) => {
                    const meta = talkingPointMeta(kind);
                    const selected = kind === selectedKind;
                    return (
                      <Pressable
                        key={kind}
                        onPress={() => {
                          triggerSelection();
                          setSelectedKind(kind);
                          pointInputRef.current?.focus();
                        }}
                        className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                          selected ? "bg-accent border-accent" : "bg-bg2 border-border"
                        }`}
                      >
                        <Text className="text-sm">{meta.icon}</Text>
                        <Text
                          className={`text-xs font-bodySemi ${
                            selected ? "text-card" : "text-text2"
                          }`}
                        >
                          {talkingPointLabel(kind, locale)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-2">
                  {selectedMeta.icon} {talkingPointLabel(selectedKind, locale)}
                </Text>
                <TextInput
                  ref={pointInputRef}
                  value={newPointText}
                  onChangeText={setNewPointText}
                  placeholder={t("gathering.addPlaceholder")}
                  placeholderTextColor={placeholderColor}
                  returnKeyType="done"
                  onSubmitEditing={() => void addPoint()}
                  style={{
                    color: inputTextColor,
                    backgroundColor: inputBgColor,
                    borderColor: inputBorderColor,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 17,
                    minHeight: 44,
                  }}
                />
                <Text className="text-xs text-text3 font-body mt-2">
                  {t("gathering.composerKindHint")}
                </Text>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <BottomSheet visible={showDelete} onDismiss={() => setShowDelete(false)} title={t("gathering.deleteEvent")}>
        <Text className="text-sm text-text2 font-body mb-4">{t("gathering.deleteEventBody")}</Text>
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
                <Text className="text-body-lg text-text1 font-body">{p.displayName}</Text>
              </Pressable>
            ))}
        </View>
      </BottomSheet>
    </AppShell>
  );
}
