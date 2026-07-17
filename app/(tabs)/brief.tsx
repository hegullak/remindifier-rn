import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { addIntention, deleteAllIntentions } from "@/db/repos/intentionsRepo";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { DateNavBar } from "@/features/brief/DateNavBar";
import { DevBriefControls } from "@/features/brief/DevBriefControls";
import { useBriefData } from "@/features/brief/useBriefData";
import { useMockCalendarPool } from "@/features/brief/useMockCalendarPool";
import { useDayData } from "@/features/day/useDayData";
import { useTranslation } from "@/i18n";
import { notifyBriefReload } from "@/lib/brief/briefRefresh";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { getCalendarWeekBounds, isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { eventIcon, iconAndTitle } from "@/lib/brief/eventIcon";
import { buildFlowSummary } from "@/lib/brief/flowSummary";
import { briefGreetingLine } from "@/lib/brief/greeting";
import {
  hasRoomForIntention,
  pickOpenIntention,
  weaveIntentionIntoFlowSummary,
} from "@/lib/brief/intentionWeave";
import { localDateKey } from "@/lib/brief/lookForward";
import { mockEventsForDay } from "@/lib/brief/mockFromCalendarPool";
import type { TrainingDisplayLine } from "@/lib/brief/pplTraining";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";
import { logger } from "@/lib/logger";
import { anniversaryMilestoneDetail } from "@/lib/milestones/anniversaries";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { PplSessionLabel } from "@/ui/PplSessionLabel";
import { SectionLabel } from "@/ui/SectionLabel";

/** Ambient narrative covers the whole day — morning briefing until 18:00, then evening wind-down. */
const MORNING_START_HOUR = 6;
const EVENING_START_MINUTES = 18 * 60;

type UnifiedItem = {
  id: string;
  sortKey: number; // daysUntil
  sortMinutes?: number; // minute-of-day for chronological ordering within a day
  dayLabel: string;
  icon: string;
  primary: string;
  secondary?: string;
  note?: string;
  onPress?: () => void;
};

type AnniversaryDetail = {
  personName: string;
  years: number;
  norwegian: string | null;
  english: string | null;
};

function trainingLineKey(line: TrainingDisplayLine, index: number): string {
  if (line.kind === "ppl") return `ppl-${line.active}`;
  return `text-${index}-${line.text}`;
}

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const {
    brief,
    dateLine,
    headsupItems,
    trainingLines,
    weekOffset,
    weekBounds,
    shiftWeek,
    resetWeek,
  } = useBriefData(userId);
  const [mockMode, setMockMode] = useState(false);
  const { pool: mockPool } = useMockCalendarPool(userId, __DEV__ && mockMode);
  /** Dev-only override so morning/evening flow-summary can be triggered on demand. */
  const [periodOverride, setPeriodOverride] = useState<"morning" | "evening" | null>(null);
  const [weekExpanded, setWeekExpanded] = useState(false);
  const [anniversaryDetail, setAnniversaryDetail] = useState<AnniversaryDetail | null>(null);

  // Day navigation for "Dagen min" — independent per-day fetch so ‹ › works
  // across week boundaries too. Flow-summary stays tied to the real today/tomorrow.
  const dayData = useDayData(userId);
  const isViewingToday = dayData.dayOffset === 0;
  const effectiveDayEvents = useMemo(() => {
    if (!mockMode || dayData.events.length > 0) return dayData.events;
    return mockEventsForDay(dayData.date, mockPool);
  }, [mockMode, dayData.events, dayData.date, mockPool]);

  const lang = locale === "no" ? "no" : "en";
  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  // Mock mode (dev-only): fill any day this week with zero real events using
  // events drawn from the user's own calendar history — for testing the flow.
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

  // Flow-summary: the day's narrative at the top of the brief. The active period
  // (morning until 18:00, then evening) picks which variant fills the block.
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function briefDayLabel(daysUntil: number): string {
    if (daysUntil === 0) return locale === "no" ? "I DAG" : "TODAY";
    if (daysUntil === 1) return locale === "no" ? "I MORGEN" : "TOMORROW";
    const d = new Date(today);
    d.setDate(today.getDate() + daysUntil);
    const label = d.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", { weekday: "long" });
    return locale === "no" ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
  }

  const redLettersThisWeek = brief.redLetterDays.filter((item) => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + item.daysUntil);
    return isDateInCalendarWeek(next, weekBounds);
  });

  const weekItems: UnifiedItem[] = [];

  for (const event of effectiveWeekEvents) {
    const { icon, title } = iconAndTitle(event.title);
    const timeStr = event.allDay
      ? undefined
      : event.startDate.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
    weekItems.push({
      id: `cal-${event.id}`,
      sortKey: event.daysUntil,
      sortMinutes: event.allDay
        ? undefined
        : event.startDate.getHours() * 60 + event.startDate.getMinutes(),
      dayLabel: briefDayLabel(event.daysUntil),
      icon,
      primary: title,
      secondary: timeStr,
    });
  }

  for (const rld of redLettersThisWeek) {
    weekItems.push({
      id: `rld-${rld.id}`,
      sortKey: rld.daysUntil,
      dayLabel: briefDayLabel(rld.daysUntil),
      icon: rld.icon,
      primary: rld.personName,
      secondary: rld.headline,
      onPress:
        rld.kind === "Anniversary"
          ? () => {
              const m = anniversaryMilestoneDetail(rld.eventDate);
              if (m) {
                setAnniversaryDetail({
                  personName: rld.personName,
                  years: m.years,
                  norwegian: m.norwegian,
                  english: m.english,
                });
              }
            }
          : undefined,
    });
  }

  if (weekOffset === 0) {
    for (const item of headsupItems) {
      const [head, ...rest] = item.text.split(" · ");
      const secondary = rest.length > 0 ? rest.join(" · ") : undefined;
      const hsIcon = eventIcon(head);
      weekItems.push({
        id: `headsup-${item.day}`,
        sortKey: item.daysUntil,
        dayLabel: briefDayLabel(item.daysUntil),
        icon: hsIcon === "🕐" ? "💡" : hsIcon,
        primary: head,
        secondary,
      });
    }
  }

  weekItems.sort((a, b) => a.sortKey - b.sortKey);
  const restItems = weekItems.filter((i) => i.sortKey > 0);
  const nowMinutesForDim = now.getHours() * 60 + now.getMinutes();

  // "Dagen min" items come from the per-day fetch (selected via ‹ ›),
  // not from the week window — precise date filtering, works for past days.
  const dayItems: UnifiedItem[] = effectiveDayEvents.map((event) => {
    const { icon, title } = iconAndTitle(event.title);
    const timeStr = event.allDay
      ? undefined
      : event.startDate.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
    return {
      id: `day-${event.id}`,
      sortKey: 0,
      sortMinutes: event.allDay
        ? undefined
        : event.startDate.getHours() * 60 + event.startDate.getMinutes(),
      dayLabel: "",
      icon,
      primary: title,
      secondary: timeStr,
    };
  });

  function renderUnifiedRow(
    item: UnifiedItem,
    i: number,
    arr: UnifiedItem[],
    showDay: boolean,
    dimmed = false,
  ) {
    const prevDay = i > 0 ? arr[i - 1].dayLabel : "";
    const showDayLabel = showDay && item.dayLabel !== prevDay;
    const row = (
      <View className={i < arr.length - 1 ? "mb-2.5" : ""}>
        {showDayLabel && (
          <Text className="text-3xs uppercase tracking-[1.2px] text-sage font-bodySemi mb-1">
            {item.dayLabel}
          </Text>
        )}
        <View className="flex-row items-start gap-2">
          <Text className="text-base mt-0.5" style={dimmed ? { opacity: 0.45 } : undefined}>
            {item.icon}
          </Text>
          <View className="flex-1">
            <Text
              className="text-body-lg text-text1 font-bodyMedium"
              style={dimmed ? { opacity: 0.45, textDecorationLine: "line-through" } : undefined}
            >
              {item.primary}
            </Text>
            {item.secondary ? (
              <Text
                className="text-sm text-text2 font-body mt-0.5"
                style={dimmed ? { opacity: 0.45 } : undefined}
              >
                {item.secondary}
              </Text>
            ) : null}
            {item.note ? (
              <Text className="text-xs text-text3 font-body mt-0.5">{item.note}</Text>
            ) : null}
          </View>
        </View>
      </View>
    );
    if (item.onPress) {
      return (
        <Pressable key={item.id} onPress={item.onPress} className="active:opacity-70">
          {row}
        </Pressable>
      );
    }
    return <View key={item.id}>{row}</View>;
  }

  function renderDagenMin() {
    // Demo schedule + training lines belong to the actual today only.
    const scheduleItems: UnifiedItem[] = isViewingToday
      ? brief.schedule.map((item) => {
          const rawTitle = item.gatheringId
            ? localizeGatheringTitle(item.gatheringId, item.title, locale)
            : item.title;
          const { icon, title } = iconAndTitle(rawTitle);
          const [h, m] = item.time.split(":").map(Number);
          return {
            id: `sched-${item.id}`,
            sortKey: 0,
            sortMinutes: Number.isFinite(h) ? h * 60 + (m || 0) : undefined,
            dayLabel: "",
            icon,
            primary: title,
            secondary: item.time,
            note: item.note || undefined,
          };
        })
      : [];

    const dayCombined = [...scheduleItems, ...dayItems].sort(
      (a, b) => (a.sortMinutes ?? -1) - (b.sortMinutes ?? -1),
    );

    const hasDay = dayCombined.length > 0;
    const hasTraining = isViewingToday && trainingLines.length > 0;
    const needDivider = hasDay && hasTraining;

    return (
      <View className="mb-1">
        <SectionLabel compact>{locale === "no" ? "Dagen min" : "My day"}</SectionLabel>
        {!hasDay && !hasTraining ? (
          <BriefCard stripeColor="blue">
            <Text className="text-body text-text2 font-body">{t("day.empty")}</Text>
          </BriefCard>
        ) : (
          <BriefCard stripeColor="blue">
            {dayCombined.map((item, i) => {
              const dimmed =
                isViewingToday &&
                item.sortMinutes !== undefined &&
                item.sortMinutes < nowMinutesForDim;
              return renderUnifiedRow(item, i, dayCombined, false, dimmed);
            })}
            {needDivider && <View className="h-px bg-border my-2.5" />}
            {hasTraining &&
              trainingLines.map((line, i) => (
                <View
                  key={trainingLineKey(line, i)}
                  className={`flex-row items-start gap-2${i < trainingLines.length - 1 ? " mb-2.5" : ""}`}
                >
                  <Text className="text-base">{i === 0 ? "🏋️" : "🏃"}</Text>
                  {line.kind === "ppl" ? (
                    <PplSessionLabel active={line.active} className="flex-1" />
                  ) : (
                    <Text className="text-body-lg text-text1 font-body flex-1">{line.text}</Text>
                  )}
                </View>
              ))}
          </BriefCard>
        )}
      </View>
    );
  }

  function renderUkenMin() {
    if (weekOffset !== 0) return null;
    if (restItems.length === 0) return null;
    return (
      <View className="mb-1">
        <SectionLabel compact>{locale === "no" ? "Uken min" : "My week"}</SectionLabel>
        {weekExpanded ? (
          <Pressable onPress={() => setWeekExpanded(false)} className="active:opacity-90">
            <BriefCard stripeColor="sage">
              {restItems.map((item, i) => renderUnifiedRow(item, i, restItems, true))}
              <Text className="text-xs text-text3 font-body mt-3">
                {locale === "no" ? "Vis mindre" : "Show less"}
              </Text>
            </BriefCard>
          </Pressable>
        ) : (
          <Pressable onPress={() => setWeekExpanded(true)} className="active:opacity-70">
            <BriefCard stripeColor="sage">
              <View className="flex-row items-center justify-between py-3">
                <Text className="text-body-lg text-text2 font-body">
                  {locale === "no"
                    ? `${restItems.length} ${restItems.length === 1 ? "hendelse" : "hendelser"} resten av uken`
                    : `${restItems.length} ${restItems.length === 1 ? "event" : "events"} rest of week`}
                </Text>
                <Text className="text-xl text-sage font-bodySemi">+{restItems.length}</Text>
              </View>
            </BriefCard>
          </Pressable>
        )}
      </View>
    );
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

        {/* Combined day + week navigation */}
        <DateNavBar
          dayLabel={dayData.dateLabel}
          weekLabel={dateLine}
          isToday={isViewingToday}
          isThisWeek={weekOffset === 0}
          onPrevDay={() => dayData.shiftDay(-1)}
          onNextDay={() => dayData.shiftDay(1)}
          onPrevWeek={() => shiftWeek(-1)}
          onNextWeek={() => shiftWeek(1)}
          onReset={() => {
            dayData.goToToday();
            resetWeek();
          }}
        />

        {renderDagenMin()}
        {renderUkenMin()}
      </ScrollView>

      <BottomSheet
        visible={anniversaryDetail !== null}
        onDismiss={() => setAnniversaryDetail(null)}
        title={t("brief.anniversarySheet.title")}
      >
        {anniversaryDetail ? (
          <View className="gap-3">
            <Text className="text-body-lg text-text1 font-bodyMedium">
              {anniversaryDetail.personName}
            </Text>
            <Text className="text-body text-text2 font-body">
              {t("brief.anniversarySheet.years", { count: anniversaryDetail.years })}
            </Text>
            {anniversaryDetail.norwegian ? (
              <View>
                <Text className="text-2xs uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  {t("brief.anniversarySheet.norwegianLabel")}
                </Text>
                <Text className="text-body-lg text-amber font-bodySemi mt-1">
                  {anniversaryDetail.norwegian}
                </Text>
              </View>
            ) : null}
            {anniversaryDetail.english ? (
              <View>
                <Text className="text-2xs uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  {t("brief.anniversarySheet.englishLabel")}
                </Text>
                <Text className="text-body-lg text-text1 font-bodyMedium mt-1">
                  {anniversaryDetail.english}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </AppShell>
  );
}
