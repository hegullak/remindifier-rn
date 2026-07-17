import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { addIntention, deleteAllIntentions } from "@/db/repos/intentionsRepo";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { DevBriefControls } from "@/features/brief/DevBriefControls";
import { useBriefData } from "@/features/brief/useBriefData";
import { useMockCalendarPool } from "@/features/brief/useMockCalendarPool";
import { useTranslation } from "@/i18n";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { buildFlowSummary } from "@/lib/brief/flowSummary";
import { briefGreetingLine } from "@/lib/brief/greeting";
import {
  hasRoomForIntention,
  pickOpenIntention,
  weaveIntentionIntoFlowSummary,
} from "@/lib/brief/intentionWeave";
import { localDateKey } from "@/lib/brief/lookForward";
import { mockEventsForDay } from "@/lib/brief/mockFromCalendarPool";
import { logger } from "@/lib/logger";
import { AppShell } from "@/ui/AppShell";

/**
 * Flow — the primary view. A Mental Forecast, not a calendar summary: it
 * interprets the shape and rhythm of the day rather than repeating events.
 * Detailed event lists live in the dedicated Day and Week tabs.
 */

const MORNING_START_HOUR = 6;
const EVENING_START_MINUTES = 18 * 60;

export default function FlowScreen() {
  const { locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const { brief } = useBriefData(userId);
  const [mockMode, setMockMode] = useState(false);
  const { pool: mockPool } = useMockCalendarPool(userId, __DEV__ && mockMode);
  /** Dev-only override so morning/evening Mental Forecast can be triggered on demand. */
  const [periodOverride, setPeriodOverride] = useState<"morning" | "evening" | null>(null);

  const lang = locale === "no" ? "no" : "en";
  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

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
  // in the evening) rather than listing its events.
  const flowPeriod = isEveningWindow ? ("evening" as const) : ("morning" as const);
  const flowFocusEvents = isEveningWindow ? effectiveTomorrowEvents : effectiveTodayEvents;
  let flowSummary =
    isMorningWindow || isEveningWindow
      ? buildFlowSummary(flowPeriod, flowFocusEvents, effectiveWeekEvents, lang)
      : null;

  // Companion moment: when the focus day has room, weave in one open intention
  // ("du antydet at du skulle ringe tante Berit denne uken").
  const todayIso = localDateKey();
  const openIntention = pickOpenIntention(brief.intentions, todayIso);
  const roomForIntention = hasRoomForIntention(flowFocusEvents);
  if (flowSummary && openIntention && roomForIntention) {
    flowSummary = weaveIntentionIntoFlowSummary(
      flowSummary,
      openIntention,
      lang,
      flowPeriod,
      todayIso,
    );
  }
  if (__DEV__ && openIntention) {
    logger.info("intention_weave", {
      surfaced: Boolean(flowSummary && roomForIntention),
      hasRoom: roomForIntention,
      period: flowPeriod,
      focusEventCount: flowFocusEvents.length,
    });
  }

  const flowSummaryHeadline =
    flowSummary?.available && !flowSummary.isEmpty ? flowSummary.headline : null;
  const flowSummaryBody = flowSummaryHeadline ? flowSummary?.body : null;

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
            onSeedIntention={seedTestIntention}
            onClearIntentions={clearTestIntentions}
          />
        ) : undefined
      }
    >
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}>
        {/* Greeting */}
        <View style={{ paddingTop: 12, paddingBottom: flowSummaryHeadline ? 4 : 12 }}>
          <Text className="text-5xl leading-tight text-text1 font-heading">
            {greetingLead} <Text className="text-accent">{greetingName}</Text>
          </Text>
        </View>

        {/* Mental Forecast — morning 06-18 or evening 18:00+ only. One editorial
            lede (headline) + one quiet flowing paragraph, not a stack of equal-weight lines. */}
        {flowSummaryHeadline ? (
          <View style={{ paddingBottom: 12 }}>
            <Text className="text-body-lg text-text1 font-bodySemi leading-[22px] mb-1.5">
              {flowSummaryHeadline}
            </Text>
            {flowSummaryBody ? (
              <Text className="text-body text-text3 font-body leading-[19px]">
                {flowSummaryBody.split("\n").filter(Boolean).join(" ")}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
