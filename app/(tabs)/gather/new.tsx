import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { triggerLight, triggerMedium, triggerSelection } from "@/lib/haptics";
import { createGathering } from "@/db/repos/gatheringsRepo";
import { listPeopleSummaries } from "@/db/repos/peopleRepo";
import { useAppAuth } from "@/features/auth/useAppAuth";
import { NaturalLanguagePrivacyNotice } from "@/features/people/NaturalLanguagePrivacyNotice";
import { useTranslation } from "@/i18n";
import type { Locale } from "@/i18n/types";
import { parseEventInput, type ParsedEventDraft } from "@/lib/gatherings/eventParser";
import {
  TALKING_POINT_KINDS,
  talkingPointLabel,
  talkingPointMeta,
  type TalkingPointKind,
} from "@/lib/gatherings/talkingPoints";
import {
  hasSeenEventParserPrivacy,
  markEventParserPrivacySeen,
} from "@/lib/people/naturalLanguageParser.privacy";
import { AppShell } from "@/ui/AppShell";
import { BriefCard } from "@/ui/BriefCard";

type Step = "input" | "preview";
type MentionChoice = "add" | "skip" | "matched";

export default function NewGatheringScreen() {
  const { userId } = useAppAuth();
  const { t, locale } = useTranslation();
  const colorScheme = useColorScheme();
  const { personId: preselectedPersonId, prefill } = useLocalSearchParams<{
    personId?: string;
    prefill?: string;
  }>();

  const [step, setStep] = useState<Step>("input");
  const [inputText, setInputText] = useState("");
  const [draft, setDraft] = useState<ParsedEventDraft | null>(null);
  const [title, setTitle] = useState("");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [privacyReady, setPrivacyReady] = useState(false);
  const [people, setPeople] = useState<{ id: string; displayName: string }[]>([]);
  const [mentionChoices, setMentionChoices] = useState<Record<string, MentionChoice>>({});
  const [addToLibraryAfter, setAddToLibraryAfter] = useState<string[]>([]);

  useEffect(() => {
    if (prefill?.trim() && !inputText) {
      setInputText(prefill.trim());
    }
  }, [prefill, inputText]);

  useEffect(() => {
    hasSeenEventParserPrivacy()
      .then((seen) => {
        setShowPrivacy(!seen);
        setPrivacyReady(true);
      })
      .catch(() => {
        setShowPrivacy(true);
        setPrivacyReady(true);
      });
  }, []);

  useEffect(() => {
    if (!userId) return;
    listPeopleSummaries(userId).then((rows) =>
      setPeople(rows.map((p) => ({ id: p.id, displayName: p.displayName }))),
    );
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        Keyboard.dismiss();
      };
    }, []),
  );

  const matchedPeople = useMemo(() => {
    if (!draft) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const name of draft.mentionedPeople) {
      const match = people.find((p) => p.displayName.toLowerCase() === name.toLowerCase());
      if (match) map.set(name, match.id);
    }
    return map;
  }, [draft, people]);

  async function handleContinue() {
    Keyboard.dismiss();
    if (showPrivacy) {
      await markEventParserPrivacySeen();
      setShowPrivacy(false);
    }
    setParsing(true);
    try {
      const parsed = await parseEventInput(inputText);
      setDraft(parsed);
      setTitle(parsed.title ?? t("gathering.newTitle"));
      const choices: Record<string, MentionChoice> = {};
      for (const name of parsed.mentionedPeople) {
        const match = people.find((p) => p.displayName.toLowerCase() === name.toLowerCase());
        choices[name] = match ? "matched" : "skip";
      }
      setMentionChoices(choices);
      setAddToLibraryAfter([]);
      setStep("preview");
    } finally {
      setParsing(false);
    }
  }

  function removeTalkingPoint(id: string) {
    if (!draft) return;
    triggerLight();
    LayoutAnimation.configureNext({
      duration: 300,
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
    setDraft({
      ...draft,
      talkingPoints: draft.talkingPoints.filter((p) => p.id !== id),
    });
  }

  function setMentionChoice(name: string, choice: MentionChoice) {
    triggerSelection();
    setMentionChoices((prev) => ({ ...prev, [name]: choice }));
    if (choice === "add") {
      setAddToLibraryAfter((prev) => (prev.includes(name) ? prev : [...prev, name]));
    } else {
      setAddToLibraryAfter((prev) => prev.filter((n) => n !== name));
    }
  }

  async function handleCreate() {
    if (!userId || !draft) return;
    setSaving(true);
    try {
      const personIds = new Set<string>();
      if (preselectedPersonId) personIds.add(preselectedPersonId);
      for (const [name, id] of matchedPeople) {
        if (mentionChoices[name] !== "skip") personIds.add(id);
      }

      const gatheringId = await createGathering(userId, {
        title: title.trim() || t("gathering.newTitle"),
        personIds: [...personIds],
        content: { talkingPoints: draft.talkingPoints.map((p) => ({ ...p })) },
      });

      triggerMedium();
      Keyboard.dismiss();

      const nextAdd = addToLibraryAfter[0];
      if (nextAdd) {
        router.replace(
          `/people/new?prefillName=${encodeURIComponent(nextAdd)}&returnTo=${encodeURIComponent(`/gather/${gatheringId}`)}`,
        );
      } else {
        router.replace(`/gather/${gatheringId}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const placeholderColor = colorScheme === "dark" ? "#7A8CAD" : "#A89E90";

  return (
    <AppShell
      headerLeft={
        step === "input" ? (
          <Pressable
            onPress={() => { triggerLight(); Keyboard.dismiss(); router.back(); }}
            hitSlop={12}
            accessibilityLabel="Back"
          >
            <Text className="text-xl text-accent font-body">←</Text>
          </Pressable>
        ) : null
      }
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardDismissMode="on-drag"
      >
        {step === "input" ? (
          <>
            <Text className="text-[28px] leading-[34px] text-text1 font-heading mt-2">
              {t("gathering.newTitle")}
            </Text>
            <Text className="text-sm text-text2 font-body mt-2 mb-4">
              {t("gathering.newSubtitle")}
            </Text>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={t("gathering.inputPlaceholder")}
              placeholderTextColor={placeholderColor}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              className="min-h-[180px] bg-bg2 border border-border rounded-xl px-4 py-3 text-body-lg text-text1 font-body"
            />
            {privacyReady && showPrivacy ? (
              <View className="mt-3">
                <NaturalLanguagePrivacyNotice
                  onDismiss={() => void markEventParserPrivacySeen().then(() => setShowPrivacy(false))}
                />
              </View>
            ) : null}
            <Pressable
              onPress={() => void handleContinue()}
              disabled={!inputText.trim() || parsing}
              className="mt-4 min-h-[48px] rounded-xl bg-accent items-center justify-center disabled:opacity-50"
            >
              {parsing ? (
                <ActivityIndicator color="#F7F4EF" />
              ) : (
                <Text className="text-base text-card font-bodySemi">{t("gathering.continue")}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => {
                triggerLight();
                Keyboard.dismiss();
                setStep("input");
              }}
              className="self-start mt-1 mb-2"
              hitSlop={12}
              accessibilityLabel="Back"
            >
              <Text className="text-xl text-accent font-body">←</Text>
            </Pressable>
            <Text className="text-xs text-amber font-bodyMedium mb-3">
              {t("people.parsePreviewNotice")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              blurOnSubmit
              returnKeyType="done"
              className="text-[28px] leading-[34px] text-text1 font-heading border-b border-accent pb-1 mb-4"
            />
            <TalkingPointsPreview draft={draft} locale={locale} t={t} onRemove={removeTalkingPoint} />
            {draft && draft.mentionedPeople.length > 0 ? (
              <View className="mt-4">
                <Text className="text-sm text-text1 font-bodyMedium mb-2">
                  👥 {t("gathering.mentionedPeople")}
                </Text>
                {draft.mentionedPeople.map((name) => {
                  const matched = matchedPeople.get(name);
                  if (matched) {
                    return (
                      <Text key={name} className="text-body text-green font-body mb-2">
                        {name} ✓
                      </Text>
                    );
                  }
                  const choice = mentionChoices[name] ?? "skip";
                  return (
                    <View key={name} className="mb-3">
                      <Text className="text-body text-text2 font-body mb-2">{name}</Text>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => setMentionChoice(name, "add")}
                          className={`px-3 py-2 rounded-pill border ${
                            choice === "add" ? "bg-accent border-accent" : "bg-bg2 border-border"
                          }`}
                        >
                          <Text
                            className={`text-xs font-bodyMedium ${
                              choice === "add" ? "text-card" : "text-text2"
                            }`}
                          >
                            {t("gathering.addToLibrary")}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setMentionChoice(name, "skip")}
                          className={`px-3 py-2 rounded-pill border ${
                            choice === "skip" ? "bg-bg2 border-accent" : "bg-bg2 border-border"
                          }`}
                        >
                          <Text
                            className={`text-xs font-bodyMedium ${
                              choice === "skip" ? "text-accent" : "text-text2"
                            }`}
                          >
                            {t("gathering.eventOnly")}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
            <Pressable
              onPress={() => void handleCreate()}
              disabled={saving}
              className="mt-6 min-h-[48px] rounded-xl bg-accent items-center justify-center disabled:opacity-50"
            >
              {saving ? (
                <ActivityIndicator color="#F7F4EF" />
              ) : (
                <Text className="text-base text-card font-bodySemi">{t("gathering.createButton")}</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </AppShell>
  );
}

function TalkingPointsPreview({
  draft,
  locale,
  t,
  onRemove,
}: {
  draft: ParsedEventDraft | null;
  locale: Locale;
  t: (key: string) => string;
  onRemove: (id: string) => void;
}) {
  if (!draft || draft.talkingPoints.length === 0) return null;

  return (
    <View className="gap-3">
      {TALKING_POINT_KINDS.map((kind) => {
        const items = draft.talkingPoints.filter((p) => p.kind === kind);
        if (items.length === 0) return null;
        const meta = talkingPointMeta(kind);
        return (
          <View key={kind}>
            <Text className="text-3xs uppercase tracking-wide text-text3 font-bodySemi mb-1">
              {meta.icon} {talkingPointLabel(kind, locale)}
            </Text>
            {items.map((point) => (
              <BriefCard key={point.id} stripeColor={meta.stripeColor}>
                <View className="flex-row items-start gap-2">
                  <Text className="text-body-lg text-text1 font-body flex-1">{point.text}</Text>
                  <Pressable onPress={() => onRemove(point.id)} hitSlop={8}>
                    <Text className="text-sm text-text3 font-body">✕</Text>
                  </Pressable>
                </View>
              </BriefCard>
            ))}
          </View>
        );
      })}
    </View>
  );
}
