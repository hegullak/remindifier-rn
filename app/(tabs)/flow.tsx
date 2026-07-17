import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addIntention,
  completeIntention,
  deleteAllIntentions,
  setIntentionAfterNote,
} from "@/db/repos/intentionsRepo";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { DevBriefControls } from "@/features/brief/DevBriefControls";
import { useBriefData } from "@/features/brief/useBriefData";
import { useMockCalendarPool } from "@/features/brief/useMockCalendarPool";
import { useTranslation } from "@/i18n";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { buildContactMomentLine, findContactMoment } from "@/lib/brief/contactMoments";
import { buildFlowStanzas } from "@/lib/brief/flowStanzas";
import { briefGreetingLine } from "@/lib/brief/greeting";
import {
  buildIntentionLine,
  findIntentionWindow,
  intentionTalkingPoints,
  pickOpenIntention,
} from "@/lib/brief/intentionWeave";
import { localDateKey } from "@/lib/brief/lookForward";
import { type MockDayScenario, mockDayEventsVariant } from "@/lib/brief/mockDay";
import { mockEventsForDay } from "@/lib/brief/mockFromCalendarPool";
import { logger } from "@/lib/logger";
import { useAppTheme } from "@/theme/ThemeProvider";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";

/**
 * Flow — the primary view. A Mental Forecast, not a calendar summary: it
 * interprets the shape and rhythm of the day rather than repeating events.
 * Detailed event lists live in the dedicated Day and Week tabs.
 */

const MORNING_START_HOUR = 6;
const EVENING_START_MINUTES = 18 * 60;

const flowStyles = StyleSheet.create({
  afterNoteInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    lineHeight: 22,
  },
});

export default function FlowScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const { isDark } = useAppTheme();
  const { brief } = useBriefData(userId);
  const [mockMode, setMockMode] = useState(false);
  const { pool: mockPool } = useMockCalendarPool(userId, __DEV__ && mockMode);
  /** Dev-only override so morning/evening Mental Forecast can be triggered on demand. */
  const [periodOverride, setPeriodOverride] = useState<"morning" | "evening" | null>(null);
  /** Dev-only load scenario override: pressing the same button again rotates to the next of 5 variants. */
  const [scenario, setScenario] = useState<{ kind: MockDayScenario | null; index: number }>({
    kind: null,
    index: 0,
  });

  function pressScenario(kind: MockDayScenario) {
    setScenario((prev) => {
      if (prev.kind !== kind) return { kind, index: 0 };
      const next = prev.index + 1;
      return next >= 5 ? { kind: null, index: 0 } : { kind, index: next };
    });
  }

  const [showResolveSheet, setShowResolveSheet] = useState(false);
  const [resolving, setResolving] = useState(false);
  /** Set right after "Gjort" — flips the sheet to the after-moment capture step. */
  const [afterNoteFor, setAfterNoteFor] = useState<{ id: string; text: string } | null>(null);
  const [afterNoteText, setAfterNoteText] = useState("");

  const lang = locale === "no" ? "no" : "en";
  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  // Greeting follows the dev period override so DM/EM previews the full variant.
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(
    firstName,
    locale,
    new Date(),
    periodOverride ?? undefined,
  );

  // Mock mode (dev-only): fill any day this week with zero real events using
  // events drawn from the user's own calendar history — for testing the forecast.
  const effectiveWeekEvents = useMemo(() => {
    if (!mockMode) return brief.weekEvents;
    const bounds = getCalendarWeekBounds();
    const filled: CalendarBriefEvent[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(bounds.start);
      day.setDate(day.getDate() + i);
      const real = brief.weekEvents.filter(
        (e) => e.startDate.toDateString() === day.toDateString(),
      );
      filled.push(...(real.length > 0 ? real : mockEventsForDay(day, mockPool)));
    }
    return filled;
  }, [mockMode, brief.weekEvents, mockPool]);

  const effectiveTodayEvents = useMemo(
    () => effectiveWeekEvents.filter((e) => e.daysUntil === 0),
    [effectiveWeekEvents],
  );
  const effectiveTomorrowEvents = useMemo(
    () => effectiveWeekEvents.filter((e) => e.daysUntil === 1),
    [effectiveWeekEvents],
  );

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isEveningWindow = periodOverride
    ? periodOverride === "evening"
    : nowMinutes >= EVENING_START_MINUTES;
  const isMorningWindow = periodOverride
    ? periodOverride === "morning"
    : !isEveningWindow && now.getHours() >= MORNING_START_HOUR;

  // Mental Forecast: interprets the focus day (today in the morning, tomorrow
  // in the evening) as a verdict + quiet stanzas, never an event list.
  const flowPeriod = isEveningWindow ? ("evening" as const) : ("morning" as const);
  const scenarioEvents = scenario.kind ? mockDayEventsVariant(scenario.kind, scenario.index) : null;
  const flowFocusEvents =
    scenarioEvents ?? (isEveningWindow ? effectiveTomorrowEvents : effectiveTodayEvents);
  const forecast =
    scenarioEvents || isMorningWindow || isEveningWindow
      ? buildFlowStanzas(flowFocusEvents, lang, flowPeriod, effectiveWeekEvents)
      : null;

  // Companion moment: scan forward within the intention's horizon (clamped to
  // this week's data) for the nearest calm day, then surface it — "you have
  // room today" or a forward-looking "Thursday looks calm" preview shown even
  // while today is busy. Silent when no day in range has room — never forced in.
  const todayIso = localDateKey();
  const weekEndIso = localDateKey(getCalendarWeekBounds().end);
  const openIntention = pickOpenIntention(brief.intentions, todayIso);
  const intentionWindow = openIntention
    ? findIntentionWindow(effectiveWeekEvents, todayIso, openIntention.dueBy, weekEndIso)
    : null;
  const intentionLine =
    forecast && openIntention && intentionWindow
      ? buildIntentionLine(openIntention, intentionWindow, lang, todayIso)
      : null;
  const intentionPoints = openIntention ? intentionTalkingPoints(openIntention) : [];

  // Contact moment: an event in the focus day naming a person the intention
  // threads know something about — one discreet prep line before you meet them.
  const contactMoment = forecast
    ? findContactMoment(flowFocusEvents, brief.intentions, brief.afterNoteThreads)
    : null;
  const contactLine = contactMoment
    ? buildContactMomentLine(contactMoment, lang, isEveningWindow ? "tomorrow" : "today")
    : null;
  if (__DEV__ && openIntention) {
    logger.info("intention_weave", {
      surfaced: Boolean(intentionLine),
      window: intentionWindow,
    });
  }

  async function handleIntentionDone() {
    if (!userId || !openIntention) return;
    setResolving(true);
    try {
      await completeIntention(userId, openIntention.id);
      notifyBriefReload();
      // Don't close yet — flip to the after-moment capture step while the
      // call/visit is still fresh in the user's head. The intention id is
      // kept locally since the reload just removed it from the open list.
      setAfterNoteFor({ id: openIntention.id, text: openIntention.text });
    } catch (error) {
      logger.error("intention_complete_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      setResolving(false);
    }
  }

  function closeResolveSheet() {
    setShowResolveSheet(false);
    setAfterNoteFor(null);
    setAfterNoteText("");
  }

  async function handleAfterNoteSave() {
    if (!userId || !afterNoteFor) return;
    const note = afterNoteText.trim();
    setResolving(true);
    try {
      if (note) {
        await setIntentionAfterNote(userId, afterNoteFor.id, note);
      }
      closeResolveSheet();
    } catch (error) {
      logger.error("intention_after_note_failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    } finally {
      setResolving(false);
    }
  }

  function seedTestIntention() {
    if (!userId) return;
    addIntention(userId, {
      text: "ringe tante Berit",
      notes: "Hvordan gikk det hos legen?\nNår skal du bli bestemor?\nNår har du tid til å møtes?",
      dueBy: localDateKey(getCalendarWeekBounds().end),
    })
      .then(() => notifyBriefReload())
      .catch((error) => {
        logger.error("intention_seed_failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
      });
  }

  function clearTestIntentions() {
    if (!userId) return;
    deleteAllIntentions(userId)
      .then(() => notifyBriefReload())
      .catch((error) => {
        logger.error("intention_clear_failed", {
          error: error instanceof Error ? error.message : "unknown",
        });
      });
  }

  return (
    <AppShell
      headerLeft={
        __DEV__ ? (
          <DevBriefControls
            mockMode={mockMode}
            onToggleMock={() => setMockMode((v) => !v)}
            periodOverride={periodOverride}
            onSetPeriod={setPeriodOverride}
            scenario={scenario.kind}
            scenarioIndex={scenario.index}
            onPressScenario={pressScenario}
            onSeedIntention={seedTestIntention}
            onClearIntentions={clearTestIntentions}
          />
        ) : undefined
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}>
        {/* Greeting */}
        <View style={{ paddingTop: 16, paddingBottom: 16 }}>
          <Text className="text-5xl leading-tight text-text1 font-heading">
            {greetingLead} <Text className="text-accent">{greetingName}</Text>
          </Text>
        </View>

        {/* Mental Forecast — verdict, then morning/afternoon/evening stanzas.
            Editorial prose, no cards. Larger type than before: Flow owns the screen now. */}
        {forecast ? (
          <View>
            <Text className="text-xl text-text1 font-bodySemi leading-[26px] mb-5">
              {forecast.verdict}
            </Text>

            {forecast.stanzas.map((stanza) => (
              <View key={stanza.period} className="mb-5">
                <Text className="text-sm uppercase tracking-[1.5px] text-text1 font-bodySemi mb-1.5">
                  {t(`day.periods.${stanza.period}`)}
                </Text>
                <Text className="text-base text-text2 font-body leading-[24px]">
                  {stanza.lines.join(" ")}
                </Text>
              </View>
            ))}

            {/* Companion voice — quiet register below a hairline: the intention
                offer (tappable -> resolve) and the contact-moment prep line. */}
            {intentionLine || contactLine ? (
              <View className="border-t border-border mt-2 pt-4">
                {intentionLine ? (
                  <Pressable
                    onPress={() => setShowResolveSheet(true)}
                    className="active:opacity-70"
                  >
                    <Text className="text-body-lg text-accent font-heading italic leading-[23px]">
                      {intentionLine}
                    </Text>
                  </Pressable>
                ) : null}
                {contactLine ? (
                  <Text
                    className={`text-body-lg text-accent font-heading italic leading-[23px]${
                      intentionLine ? " mt-3" : ""
                    }`}
                  >
                    {contactLine}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={showResolveSheet}
        onDismiss={closeResolveSheet}
        title={afterNoteFor ? t("intentions.afterNoteTitle") : t("intentions.resolveTitle")}
      >
        {afterNoteFor ? (
          /* Step 2 — after-moment capture, while the call/visit is fresh.
             Whatever lands here is carried forward as talking points the next
             time an intention with the same text is created. */
          <View>
            <Text className="text-body-lg text-text1 font-bodyMedium mb-4">
              {afterNoteFor.text}
            </Text>
            <TextInput
              value={afterNoteText}
              onChangeText={setAfterNoteText}
              placeholder={t("intentions.afterNotePlaceholder")}
              placeholderTextColor={isDark ? "#7A8CAD" : "#A89E90"}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                flowStyles.afterNoteInput,
                {
                  color: isDark ? "#EEF0F5" : "#1C1915",
                  backgroundColor: isDark ? "#222838" : "#EFECE3",
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
                },
              ]}
            />
            <View className="gap-2 mt-4">
              <Button
                onPress={handleAfterNoteSave}
                loading={resolving}
                disabled={resolving || !afterNoteText.trim()}
              >
                {t("common.save")}
              </Button>
              <Button variant="ghost" onPress={closeResolveSheet} disabled={resolving}>
                {t("intentions.afterNoteSkip")}
              </Button>
            </View>
          </View>
        ) : (
          /* Step 1 — the preparation moment: talking points captured with the
             intention, shown right before the user acts on it. */
          <View>
            <Text className="text-body-lg text-text1 font-bodyMedium mb-4">
              {openIntention?.text}
            </Text>

            {intentionPoints.length > 0 ? (
              <View className="mb-5">
                <Text className="text-3xs uppercase tracking-[1.5px] text-text3 font-bodySemi mb-2">
                  {t("intentions.talkingPointsLabel")}
                </Text>
                {intentionPoints.map((point) => (
                  <View key={point} className="flex-row items-start gap-2 mb-1.5">
                    <Text className="text-body text-accent font-body">·</Text>
                    <Text className="text-body text-text2 font-body leading-[20px] flex-1">
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View className="gap-2">
              <Button onPress={handleIntentionDone} loading={resolving} disabled={resolving}>
                {t("intentions.done")}
              </Button>
              <Button variant="ghost" onPress={closeResolveSheet} disabled={resolving}>
                {t("intentions.notNow")}
              </Button>
            </View>
          </View>
        )}
      </BottomSheet>
    </AppShell>
  );
}
