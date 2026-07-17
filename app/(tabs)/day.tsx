import { ScrollView, Text, View } from "react-native";
import { useAppAuth } from "@/features/auth/useAppAuth";
import type { UnifiedItem } from "@/features/brief/UnifiedItem";
import { UnifiedItemRow } from "@/features/brief/UnifiedItemRow";
import { useBriefData } from "@/features/brief/useBriefData";
import { DayPickerHeader } from "@/features/day/DayPickerHeader";
import { useDayData } from "@/features/day/useDayData";
import { useTranslation } from "@/i18n";
import { iconAndTitle } from "@/lib/brief/eventIcon";
import type { TrainingDisplayLine } from "@/lib/brief/pplTraining";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";
import { AppShell } from "@/ui/AppShell";
import { BriefCard } from "@/ui/BriefCard";
import { PplSessionLabel } from "@/ui/PplSessionLabel";

/**
 * Day — the detailed, operational view of a single day. Supports the Mental
 * Forecast on Flow rather than duplicating it: this is where events, the demo
 * schedule and training actually live, with past items visibly subdued.
 */

function trainingLineKey(line: TrainingDisplayLine, index: number): string {
  if (line.kind === "ppl") return `ppl-${line.active}`;
  return `text-${index}-${line.text}`;
}

export default function DayScreen() {
  const { t, locale } = useTranslation();
  const { userId } = useAppAuth();
  const { brief, trainingLines } = useBriefData(userId);
  const dayData = useDayData(userId);
  const isViewingToday = dayData.dayOffset === 0;

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dayItems: UnifiedItem[] = dayData.events.map((event) => {
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
    <AppShell>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 130 }}
      >
        <Text className="text-3xl leading-[36px] text-text1 font-heading mb-3">
          {t("day.title")}
        </Text>

        <DayPickerHeader
          dateLabel={dayData.dateLabel}
          dayOffset={dayData.dayOffset}
          onPrev={() => dayData.shiftDay(-1)}
          onNext={() => dayData.shiftDay(1)}
          onToday={dayData.goToToday}
        />

        {!hasDay && !hasTraining ? (
          <BriefCard stripeColor="blue">
            <Text className="text-body text-text2 font-body">{t("day.empty")}</Text>
          </BriefCard>
        ) : (
          <BriefCard stripeColor="blue">
            {dayCombined.map((item, i) => {
              const dimmed =
                isViewingToday && item.sortMinutes !== undefined && item.sortMinutes < nowMinutes;
              return (
                <UnifiedItemRow
                  key={item.id}
                  item={item}
                  isLast={i === dayCombined.length - 1}
                  showDayLabel={false}
                  dimmed={dimmed}
                />
              );
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
      </ScrollView>
    </AppShell>
  );
}
