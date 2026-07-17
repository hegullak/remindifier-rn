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
import { buildFlowStanzas } from "@/lib/brief/flowStanzas";
import { briefGreetingLine } from "@/lib/brief/greeting";
import {
  buildIntentionLine,
  hasRoomForIntention,
  pickOpenIntention,
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
  const { t, locale } = useTranslation();
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
  // in the evening) as a verdict + three quiet stanzas, never an event list.
  const flowPeriod = isEveningWindow ? ("evening" as const) : ("morning" as const);
  const flowFocusEvents = isEveningWindow ? effectiveTomorrowEvents : effectiveTodayEvents;
  const forecast =
    isMorningWindow || isEveningWindow ? buildFlowStanzas(flowFocusEvents, lang, flowPeriod) : null;

  // Companion moment: when the focus day has room, one open intention gets its
  // own quiet line ("du antydet at du skulle ringe tante Berit denne uken").
  const todayIso = localDateKey();
  const openIntention = pickOpenIntention(brief.intentions, todayIso);
  const roomForIntention = hasRoomForIntention(flowFocusEvents);
  const intentionLine =
    forecast && openIntention && roomForIntention
      ? buildIntentionLine(openIntention, lang, flowPeriod, todayIso)
      : null;
  if (__DEV__ && openIntention) {
    logger.info("intention_weave", {
      surfaced: Boolean(intentionLine),
      hasRoom: roomForIntention,
      period: flowPeriod,
      focusEventCount: flowFocusEvents.length,
    });
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
              <View key={stanza.period} className="mb-4">
                <Text className="text-2xs uppercase tracking-[1.92px] text-text3 font-bodySemi mb-1">
                  {t(`day.periods.${stanza.period}`)}
                </Text>
                <Text className="text-body-lg text-text2 font-body leading-[23px]">
                  {stanza.lines.join(" ")}
                </Text>
              </View>
            ))}

            {intentionLine ? (
              <View className="border-t border-border mt-2 pt-4">
                <Text className="text-body-lg text-accent font-heading italic leading-[23px]">
                  {intentionLine}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </AppShell>
  );
}
