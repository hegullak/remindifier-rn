import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { addIntention, completeIntention, deleteAllIntentions } from "@/db/repos/intentionsRepo";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { DevBriefControls } from "@/features/brief/DevBriefControls";
import { useBriefData } from "@/features/brief/useBriefData";
import { useMockCalendarPool } from "@/features/brief/useMockCalendarPool";
import { useTranslation } from "@/i18n";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { buildFlowStanzas } from "@/lib/brief/flowStanzas";
import { briefGreetingLine } from "@/lib/brief/greeting";
import {
  buildIntentionLine,
  findIntentionWindow,
  pickOpenIntention,
} from "@/lib/brief/intentionWeave";
import { localDateKey } from "@/lib/brief/lookForward";
import { type MockDayScenario, mockDayEventsVariant } from "@/lib/brief/mockDay";
import { mockEventsForDay } from "@/lib/brief/mockFromCalendarPool";
import { logger } from "@/lib/logger";
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

export default function FlowScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
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
      setShowResolveSheet(false);
    } catch (error) {
      logger.error("intention_complete_failed", {
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

            {intentionLine ? (
              <Pressable
                onPress={() => setShowResolveSheet(true)}
                className="border-t border-border mt-2 pt-4 active:opacity-70"
              >
                <Text className="text-body-lg text-accent font-heading italic leading-[23px]">
                  {intentionLine}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={showResolveSheet}
        onDismiss={() => setShowResolveSheet(false)}
        title={t("intentions.resolveTitle")}
      >
        <Text className="text-body-lg text-text1 font-bodyMedium mb-5">{openIntention?.text}</Text>
        <View className="gap-2">
          <Button onPress={handleIntentionDone} loading={resolving} disabled={resolving}>
            {t("intentions.done")}
          </Button>
          <Button variant="ghost" onPress={() => setShowResolveSheet(false)} disabled={resolving}>
            {t("intentions.notNow")}
          </Button>
        </View>
      </BottomSheet>
    </AppShell>
  );
}
