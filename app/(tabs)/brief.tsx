import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { BriefDateHeader } from "@/features/brief/BriefDateHeader";
import { CalendarAccessNotice } from "@/features/brief/CalendarAccessNotice";
import { LookForwardPrompt } from "@/features/brief/LookForwardPrompt";
import { LookForwardSavedRow } from "@/features/brief/LookForwardSavedRow";
import { useBriefData } from "@/features/brief/useBriefData";
import { useTranslation } from "@/i18n";
import { isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { buildEveningWindDown } from "@/lib/brief/eveningWindDown";
import { eventIcon, iconAndTitle } from "@/lib/brief/eventIcon";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { lookForwardDisplayText, shouldShowLookForwardPrompt } from "@/lib/brief/lookForward";
import { buildMorningBrief } from "@/lib/brief/morningBrief";
import type { TrainingDisplayLine } from "@/lib/brief/pplTraining";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";
import { anniversaryMilestoneDetail } from "@/lib/milestones/anniversaries";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { PplSessionLabel } from "@/ui/PplSessionLabel";
import { SectionLabel } from "@/ui/SectionLabel";

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const {
    brief,
    headsupItems,
    trainingLines,
    weekOffset,
    weekBounds,
    lookForward,
    saveLookForward,
    dismissLookForward,
    deleteLookForward,
    calendarAccess,
  } = useBriefData(userId);
  const morningBrief = buildMorningBrief(brief.todayEvents ?? [], brief.weekEvents ?? [], locale);
  const windDown = buildEveningWindDown(brief.tomorrowEvents ?? [], brief.weekEvents ?? [], locale);
  const [showMorningBrief, setShowMorningBrief] = useState(false);
  const [showEveningWindDown, setShowEveningWindDown] = useState(false);
  const [weekExpanded, setWeekExpanded] = useState(false);
  const [pastExpanded, setPastExpanded] = useState(false);
  const [lookForwardEditing, setLookForwardEditing] = useState(false);
  const [anniversaryDetail, setAnniversaryDetail] = useState<{
    personName: string;
    years: number;
    norwegian: string | null;
    english: string | null;
  } | null>(null);

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const redLettersThisWeek = brief.redLetterDays.filter((item) => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + item.daysUntil);
    return isDateInCalendarWeek(next, weekBounds);
  });

  function briefDayLabel(daysUntil: number): string {
    if (daysUntil === 0) return locale === "no" ? "I DAG" : "TODAY";
    if (daysUntil === 1) return locale === "no" ? "I MORGEN" : "TOMORROW";
    const d = new Date(today);
    d.setDate(today.getDate() + daysUntil);
    const label = d.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", { weekday: "long" });
    return locale === "no" ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
  }

  type UnifiedItem = {
    id: string;
    sortKey: number;
    sortMinutes?: number; // minute-of-day for chronological ordering within a day
    dayLabel: string;
    icon: string;
    primary: string;
    secondary?: string;
    note?: string;
    onPress?: () => void;
  };

  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const lookForwardText = lookForwardDisplayText(lookForward);
  const showLookForwardPrompt =
    weekOffset === 0 && (lookForwardEditing || shouldShowLookForwardPrompt(lookForward));

  const weekItems: UnifiedItem[] = [];

  for (const event of brief.calendarEvents) {
    const eventDay = new Date(event.startDate);
    eventDay.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
    const rawTitle = event.gatheringId
      ? localizeGatheringTitle(event.gatheringId, event.title, locale)
      : event.title;
    const { icon, title } = iconAndTitle(rawTitle);
    const timeStr = event.allDay
      ? undefined
      : event.startDate.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
    const calendarLabel = event.calendarName?.trim();
    weekItems.push({
      id: `cal-${event.id}`,
      sortKey: daysUntil,
      sortMinutes: event.allDay
        ? undefined
        : event.startDate.getHours() * 60 + event.startDate.getMinutes(),
      dayLabel: briefDayLabel(daysUntil),
      icon,
      primary: title,
      secondary: [timeStr, calendarLabel].filter(Boolean).join(" · ") || undefined,
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
              if (m)
                setAnniversaryDetail({
                  personName: rld.personName,
                  years: m.years,
                  norwegian: m.norwegian,
                  english: m.english,
                });
            }
          : undefined,
    });
  }

  if (weekOffset === 0) {
    for (const item of headsupItems) {
      // Split "Legetime · 15:00 på Åsane" → primary "Legetime", secondary "15:00 på Åsane"
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
  const todayItems = weekItems.filter((i) => i.sortKey === 0);
  const tomorrowItems = weekItems.filter((i) => i.sortKey === 1);
  const laterWeekItems = weekItems.filter((i) => i.sortKey >= 2);
  const restItems = laterWeekItems;

  function renderUnifiedRow(
    item: UnifiedItem,
    i: number,
    arr: UnifiedItem[],
    showDay: boolean,
    allowNavigation = true,
  ) {
    const prevDay = i > 0 ? arr[i - 1].dayLabel : "";
    const showDayLabel = showDay && item.dayLabel !== prevDay;
    const navigable = allowNavigation && Boolean(item.onPress);
    const row = (
      <View className={i < arr.length - 1 ? "mb-3" : ""}>
        {showDayLabel && (
          <Text className="text-3xs uppercase tracking-[1.2px] text-sage font-bodySemi mb-1">
            {item.dayLabel}
          </Text>
        )}
        <View className="flex-row items-start gap-2">
          <Text className="text-base mt-0.5">{item.icon}</Text>
          <View className="flex-1">
            <Text className="text-body-lg text-text1 font-bodyMedium">{item.primary}</Text>
            {item.secondary ? (
              <Text className="text-sm text-text2 font-body mt-0.5">{item.secondary}</Text>
            ) : null}
            {item.note ? (
              <Text className="text-xs text-text3 font-body mt-0.5">{item.note}</Text>
            ) : null}
          </View>
          {navigable ? <Text className="text-base text-text3 font-body mt-0.5">›</Text> : null}
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

  function renderPastDropdown(pastItems: UnifiedItem[]) {
    if (pastItems.length === 0) return null;
    const label =
      pastItems.length === 1
        ? t("brief.pastEventsOne")
        : t("brief.pastEvents", { count: pastItems.length });

    return (
      <View>
        <Pressable
          onPress={() => setPastExpanded((open) => !open)}
          accessibilityRole="button"
          accessibilityState={{ expanded: pastExpanded }}
          className="active:opacity-70"
        >
          <View className="flex-row items-center justify-between py-2">
            <Text className="text-body text-text3 font-bodyMedium">{label}</Text>
            <Text className="text-lg text-text3 font-bodySemi">{pastExpanded ? "▴" : "▾"}</Text>
          </View>
        </Pressable>
        {pastExpanded ? (
          <View className="pt-1">
            {pastItems.map((item, i) => renderUnifiedRow(item, i, pastItems, false, false))}
          </View>
        ) : null}
      </View>
    );
  }

  function renderIMorgen() {
    if (weekOffset !== 0) return null;
    if (tomorrowItems.length === 0) return null;

    const sorted = [...tomorrowItems].sort((a, b) => (a.sortMinutes ?? -1) - (b.sortMinutes ?? -1));

    return (
      <View className="mb-1">
        <SectionLabel>{t("brief.tomorrowSection")}</SectionLabel>
        <BriefCard stripeColor="amber">
          {sorted.map((item, i) => renderUnifiedRow(item, i, sorted, false))}
        </BriefCard>
      </View>
    );
  }

  function renderDagenMin() {
    if (weekOffset !== 0) return null;

    // Merge demo schedule + today's calendar/red-letter items into one chronological list
    const scheduleItems: UnifiedItem[] = brief.schedule.map((item) => {
      const rawTitle = item.gatheringId
        ? localizeGatheringTitle(item.gatheringId, item.title, locale)
        : item.title;
      const { icon, title } = iconAndTitle(rawTitle);
      const [h, m] = item.time.split(":").map(Number);
      return {
        id: `sched-${item.id}`,
        sortKey: 0,
        sortMinutes: Number.isFinite(h) ? h * 60 + (m || 0) : undefined,
        dayLabel: "I DAG",
        icon,
        primary: title,
        secondary: item.time,
        note: item.note || undefined,
      };
    });

    const dayCombined = [...scheduleItems, ...todayItems].sort(
      (a, b) => (a.sortMinutes ?? -1) - (b.sortMinutes ?? -1),
    );

    const upcomingToday = dayCombined.filter(
      (item) => item.sortMinutes === undefined || item.sortMinutes >= nowMinutes,
    );
    const pastToday = dayCombined.filter(
      (item) => item.sortMinutes !== undefined && item.sortMinutes < nowMinutes,
    );

    const hasUpcoming = upcomingToday.length > 0;
    const hasPast = pastToday.length > 0;
    const hasTraining = trainingLines.length > 0;
    const hasLookForward = Boolean(lookForwardText);
    if (!hasUpcoming && !hasPast && !hasTraining && !hasLookForward) return null;
    const needDividerLookForward = hasLookForward && hasUpcoming;
    const needDivider1 = hasUpcoming && hasTraining;
    const needDivider2 = (hasUpcoming || hasTraining || hasLookForward) && hasPast;

    return (
      <View className="mb-1">
        <SectionLabel>{locale === "no" ? "Dagen min" : "My day"}</SectionLabel>
        <BriefCard stripeColor="gold">
          {lookForwardText && !lookForwardEditing ? (
            <LookForwardSavedRow
              text={lookForwardText}
              onEdit={() => setLookForwardEditing(true)}
              onDelete={() => void deleteLookForward()}
            />
          ) : null}
          {needDividerLookForward && hasUpcoming ? <View className="h-px bg-border mb-3" /> : null}
          {upcomingToday.map((item, i) => renderUnifiedRow(item, i, upcomingToday, false))}
          {needDivider1 && <View className="h-px bg-border my-3" />}
          {trainingLines.map((line, i) => (
            <View
              key={trainingLineKey(line, i)}
              className={`flex-row items-start gap-2${i < trainingLines.length - 1 ? " mb-3" : ""}`}
            >
              <Text className="text-base">{i === 0 ? "🏋️" : "🏃"}</Text>
              {line.kind === "ppl" ? (
                <PplSessionLabel active={line.active} className="flex-1" />
              ) : (
                <Text className="text-body-lg text-text1 font-body flex-1">{line.text}</Text>
              )}
            </View>
          ))}
          {needDivider2 && <View className="h-px bg-border my-3" />}
          {renderPastDropdown(pastToday)}
        </BriefCard>
      </View>
    );
  }

  function renderUkenMin() {
    if (weekOffset !== 0) return null;
    if (restItems.length === 0) return null;
    return (
      <View className="mb-1">
        <SectionLabel>{locale === "no" ? "Uken min" : "My week"}</SectionLabel>
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

  // Ambient brief: morgen 06–09, kveld 20:30+
  const ambientPeriod = (() => {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    const minutes = h * 60 + m;
    if (h >= 6 && h < 9) return "morning";
    if (minutes >= 20 * 60 + 30) return "evening";
    return null;
  })();

  const ambientHeadline =
    ambientPeriod === "morning" && morningBrief.available && !morningBrief.isEmpty
      ? morningBrief.headline
      : ambientPeriod === "evening" && windDown.available && !windDown.isEmpty
        ? windDown.headline
        : null;

  // Trekk ut relevante detalj-setninger fra body
  const ambientDetails = (() => {
    const src =
      ambientPeriod === "morning" ? morningBrief : ambientPeriod === "evening" ? windDown : null;
    if (!src?.available || src.isEmpty || !ambientHeadline) return [];
    const sentences = src.body.split("\n").filter(Boolean);
    const find = (kw: string) => sentences.find((s) => s.toLowerCase().includes(kw));
    const lines: string[] = [];
    const firstEvent = sentences[0]; // "Første møte kl. 09:00." / "Første hendelse er kl. …"
    if (firstEvent) lines.push(firstEvent);
    const lunch = find("lunsj") ?? find("lunch");
    if (lunch && lunch !== firstEvent) lines.push(lunch);
    const weekend = find("helg") ?? find("weekend");
    if (weekend) lines.push(weekend);
    return lines;
  })();

  const ambientOnPress =
    ambientPeriod === "morning"
      ? () => setShowMorningBrief(true)
      : ambientPeriod === "evening"
        ? () => setShowEveningWindDown(true)
        : undefined;

  const listHeader = (
    <View className="pb-2">
      {/* Hilsen — visuelt anker */}
      <View style={{ paddingTop: 16, paddingBottom: 4 }}>
        <Text className="text-5xl leading-tight text-text1 font-heading">
          {greetingLead}
          {"\n"}
          <Text className="text-accent">{greetingName}</Text>
        </Text>
      </View>

      <BriefDateHeader />

      {weekOffset === 0 ? (
        <CalendarAccessNotice
          access={calendarAccess}
          hasDevStubs={
            calendarAccess !== "granted" &&
            brief.calendarEvents.some((e) => e.id.startsWith("dev-stub-"))
          }
        />
      ) : null}

      {showLookForwardPrompt ? (
        <LookForwardPrompt
          initialText={lookForwardEditing ? (lookForwardText ?? "") : ""}
          onSave={async (text) => {
            await saveLookForward(text);
            setLookForwardEditing(false);
          }}
          onDismiss={async () => {
            if (lookForwardEditing) {
              setLookForwardEditing(false);
            } else {
              await dismissLookForward();
            }
          }}
        />
      ) : null}

      {/* Ambient — kun morgen 06–09 eller kveld 20:30+ */}
      {ambientHeadline ? (
        <Pressable
          onPress={ambientOnPress}
          className="active:opacity-70"
          hitSlop={4}
          style={{ paddingBottom: 20 }}
        >
          <Text className="text-body-lg text-text1 font-body leading-[24px] mb-2">
            {ambientHeadline}
          </Text>
          {ambientDetails.map((line, i) => (
            <Text key={i} className="text-body text-text3 font-body leading-[20px] mb-0.5">
              {line}
            </Text>
          ))}
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <AppShell>
      <ScrollView
        testID="brief-screen"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
      >
        {listHeader}
        {renderDagenMin()}
        {renderIMorgen()}
        {renderUkenMin()}
      </ScrollView>

      <BottomSheet
        visible={showMorningBrief}
        onDismiss={() => setShowMorningBrief(false)}
        title={t("brief.morningBrief.sectionLabel")}
        large
      >
        <Text className="text-xl text-text1 font-heading mb-5 leading-[28px]">
          {morningBrief.headline}
        </Text>
        {morningBrief.body
          .split("\n")
          .filter(Boolean)
          .map((sentence, i) => (
            <Text key={i} className="text-body-lg text-text2 font-body leading-[24px] mb-2">
              {sentence}
            </Text>
          ))}
      </BottomSheet>

      <BottomSheet
        visible={showEveningWindDown}
        onDismiss={() => setShowEveningWindDown(false)}
        title={t("brief.eveningWindDown.sectionLabel")}
        large
      >
        <Text className="text-xl text-text1 font-heading mb-5 leading-[28px]">
          {windDown.headline}
        </Text>
        {windDown.body
          .split("\n")
          .filter(Boolean)
          .map((sentence, i) => (
            <Text key={i} className="text-body-lg text-text2 font-body leading-[24px] mb-2">
              {sentence}
            </Text>
          ))}
      </BottomSheet>

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

function trainingLineKey(line: TrainingDisplayLine, index: number): string {
  if (line.kind === "ppl") return `ppl-${line.active}`;
  return `text-${index}-${line.text}`;
}
