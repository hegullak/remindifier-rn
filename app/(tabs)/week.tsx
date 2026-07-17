import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth } from "@/features/auth/useAppAuth";
import type { UnifiedItem } from "@/features/brief/UnifiedItem";
import { UnifiedItemRow, withDayLabels } from "@/features/brief/UnifiedItemRow";
import { useBriefData } from "@/features/brief/useBriefData";
import { WeekPickerHeader } from "@/features/day/WeekPickerHeader";
import { useTranslation } from "@/i18n";
import { isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { eventIcon, iconAndTitle } from "@/lib/brief/eventIcon";
import { anniversaryMilestoneDetail } from "@/lib/milestones/anniversaries";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";

/**
 * Week — upcoming important events grouped by day. Supports the Mental
 * Forecast on Flow (which only looks at today/tomorrow) with a look-ahead;
 * deliberately not a seven-column calendar grid.
 */

type AnniversaryDetail = {
  personName: string;
  years: number;
  norwegian: string | null;
  english: string | null;
};

export default function WeekScreen() {
  const { t, locale } = useTranslation();
  const { userId } = useAppAuth();
  const { brief, dateLine, headsupItems, weekOffset, weekBounds, shiftWeek, resetWeek } =
    useBriefData(userId);
  const [weekExpanded, setWeekExpanded] = useState(false);
  const [anniversaryDetail, setAnniversaryDetail] = useState<AnniversaryDetail | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function dayLabelFor(daysUntil: number): string {
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

  for (const event of brief.weekEvents) {
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
      dayLabel: dayLabelFor(event.daysUntil),
      icon,
      primary: title,
      secondary: timeStr,
    });
  }

  for (const rld of redLettersThisWeek) {
    weekItems.push({
      id: `rld-${rld.id}`,
      sortKey: rld.daysUntil,
      dayLabel: dayLabelFor(rld.daysUntil),
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
        dayLabel: dayLabelFor(item.daysUntil),
        icon: hsIcon === "🕐" ? "💡" : hsIcon,
        primary: head,
        secondary,
      });
    }
  }

  weekItems.sort((a, b) => a.sortKey - b.sortKey);
  const restItems = weekItems.filter((i) => i.sortKey > 0);
  const labeledRestItems = withDayLabels(restItems, true);

  return (
    <AppShell>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130 }}
      >
        <Text className="text-3xl leading-[36px] text-text1 font-heading mb-3">
          {t("week.title")}
        </Text>

        <WeekPickerHeader
          weekLabel={dateLine}
          isThisWeek={weekOffset === 0}
          onPrev={() => shiftWeek(-1)}
          onNext={() => shiftWeek(1)}
          onReset={resetWeek}
        />

        {weekOffset !== 0 || restItems.length === 0 ? (
          <BriefCard stripeColor="sage">
            <Text className="text-body text-text2 font-body">
              {locale === "no" ? "Ingen kommende hendelser." : "Nothing coming up."}
            </Text>
          </BriefCard>
        ) : weekExpanded ? (
          <Pressable onPress={() => setWeekExpanded(false)} className="active:opacity-90">
            <BriefCard stripeColor="sage">
              {labeledRestItems.map(({ item, showDayLabel }, i) => (
                <UnifiedItemRow
                  key={item.id}
                  item={item}
                  isLast={i === labeledRestItems.length - 1}
                  showDayLabel={showDayLabel}
                />
              ))}
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
