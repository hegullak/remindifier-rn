import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { CalendarAccessNotice } from "@/features/brief/CalendarAccessNotice";
import { ImportantItemsCard } from "@/features/brief/ImportantItemsCard";
import { useBriefData } from "@/features/brief/useBriefData";
import { useMockCalendarPool } from "@/features/brief/useMockCalendarPool";
import { DayPickerHeader } from "@/features/day/DayPickerHeader";
import { DayTimeline } from "@/features/day/DayTimeline";
import { useDayData } from "@/features/day/useDayData";
import { useTranslation } from "@/i18n";
import { getCalendarWeekBounds } from "@/lib/brief/calendarWeek";
import { groupEventsByPeriod } from "@/lib/brief/dayTimeline";
import { buildEveningWindDown } from "@/lib/brief/eveningWindDown";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { interpretDay } from "@/lib/brief/interpretDay";
import { mockEventsForDay } from "@/lib/brief/mockFromCalendarPool";
import { buildMorningBrief } from "@/lib/brief/morningBrief";
import { AppShell } from "@/ui/AppShell";
import { SectionLabel } from "@/ui/SectionLabel";

/** Ambient narrative covers the whole day — morning briefing until 18:00, then evening wind-down. */
const MORNING_START_HOUR = 6;
const EVENING_START_MINUTES = 18 * 60;

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const { brief, calendarAccess } = useBriefData(userId);
  const dayData = useDayData(userId);
  const [mockMode, setMockMode] = useState(false);
  const { pool: mockPool } = useMockCalendarPool(userId, __DEV__ && mockMode);

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  const lang = locale === "no" ? "no" : "en";
  const isToday = dayData.dayOffset === 0;

  // Mock mode: fill any day in the current week that has zero real events
  // with events drawn from the user's own calendar history.
  const effectiveWeekEvents = useMemo(() => {
    if (!mockMode) return brief.weekEvents;
    const bounds = getCalendarWeekBounds();
    const filled = [];
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
    () =>
      effectiveWeekEvents.filter((e) => e.startDate.toDateString() === new Date().toDateString()),
    [effectiveWeekEvents],
  );

  const effectiveTomorrowEvents = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return effectiveWeekEvents.filter(
      (e) => e.startDate.toDateString() === tomorrow.toDateString(),
    );
  }, [effectiveWeekEvents]);

  const effectiveDayEvents = useMemo(() => {
    if (!mockMode || dayData.events.length > 0) return dayData.events;
    return mockEventsForDay(dayData.date, mockPool);
  }, [mockMode, dayData.events, dayData.date, mockPool]);

  const effectiveTimeline = useMemo(
    () => (mockMode ? groupEventsByPeriod(effectiveDayEvents) : dayData.timeline),
    [mockMode, effectiveDayEvents, dayData.timeline],
  );

  const morningBrief = buildMorningBrief(effectiveTodayEvents, effectiveWeekEvents, lang);
  const windDown = buildEveningWindDown(effectiveTomorrowEvents, effectiveWeekEvents, lang);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isEveningWindow = nowMinutes >= EVENING_START_MINUTES;
  const isMorningWindow = !isEveningWindow && now.getHours() >= MORNING_START_HOUR;

  const ambientHeadline = isMorningWindow
    ? morningBrief.available && !morningBrief.isEmpty
      ? morningBrief.headline
      : null
    : isEveningWindow
      ? windDown.available && !windDown.isEmpty
        ? windDown.headline
        : null
      : null;

  const ambientBody = isMorningWindow ? morningBrief.body : isEveningWindow ? windDown.body : null;

  const laterThisWeek = useMemo(
    () => interpretDay(effectiveDayEvents, effectiveWeekEvents, lang, "morning").laterThisWeek,
    [effectiveDayEvents, effectiveWeekEvents, lang],
  );

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}>
        {/* Greeting */}
        <View style={{ paddingTop: 16, paddingBottom: ambientHeadline ? 6 : 12 }}>
          <Text className="text-5xl leading-tight text-text1 font-heading">
            {greetingLead}
            {"\n"}
            <Text className="text-accent">{greetingName}</Text>
          </Text>
        </View>

        {/* Ambient day narrative — morning 06-18 or evening 18:00+ only */}
        {ambientHeadline ? (
          <View style={{ paddingBottom: 20 }}>
            <Text className="text-body-lg text-text1 font-body leading-[24px] mb-2">
              {ambientHeadline}
            </Text>
            {ambientBody
              ?.split("\n")
              .filter(Boolean)
              .map((line) => (
                <Text key={line} className="text-body text-text3 font-body leading-[20px] mb-0.5">
                  {line}
                </Text>
              ))}
          </View>
        ) : null}

        {/* Dev-only: mock mode toggle */}
        {__DEV__ && (
          <Pressable
            onPress={() => setMockMode((v) => !v)}
            className={`self-start px-3 py-1.5 rounded-pill border mb-3 ${
              mockMode ? "border-accent bg-accentLight" : "border-border"
            }`}
          >
            <Text
              className={`text-2xs uppercase tracking-[1px] font-bodySemi ${
                mockMode ? "text-accent" : "text-text3"
              }`}
            >
              {mockMode ? "Mock: on" : "Mock: off"}
            </Text>
          </Pressable>
        )}

        {/* Date picker */}
        <DayPickerHeader
          dateLabel={dayData.dateLabel}
          dayOffset={dayData.dayOffset}
          onPrev={() => dayData.shiftDay(-1)}
          onNext={() => dayData.shiftDay(1)}
          onToday={dayData.goToToday}
        />

        {/* Calendar access notice */}
        <CalendarAccessNotice
          access={calendarAccess}
          hasDevStubs={
            calendarAccess !== "granted" && dayData.events.some((e) => e.id.startsWith("dev-stub-"))
          }
        />

        {/* Dagens agenda — strikethrough for passed events when viewing today */}
        {effectiveTimeline.allDay.length > 0 || effectiveTimeline.periods.length > 0 ? (
          <View className="mt-4">
            <SectionLabel>{locale === "no" ? "Dagen min" : "My day"}</SectionLabel>
            <DayTimeline timeline={effectiveTimeline} isToday={isToday} />
          </View>
        ) : null}

        {/* Viktige hendelser senere i uken */}
        {laterThisWeek.length > 0 && (
          <ImportantItemsCard
            label={t("brief.cards.laterThisWeek")}
            items={laterThisWeek}
            stripeColor="dusk"
            showDayLabel
          />
        )}
      </ScrollView>
    </AppShell>
  );
}
