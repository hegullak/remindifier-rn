import { Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import { formatTime } from "@/lib/brief/briefHelpers";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import type { DayPeriodId, DayTimeline as DayTimelineData } from "@/lib/brief/dayTimeline";
import { iconAndTitle } from "@/lib/brief/eventIcon";
import { SectionLabel } from "@/ui/SectionLabel";

const PERIOD_LABEL_KEY: Record<DayPeriodId, string> = {
  morning: "day.periods.morning",
  lunch: "day.periods.lunch",
  afternoon: "day.periods.afternoon",
  evening: "day.periods.evening",
};

function EventRow({
  event,
  showEndTime,
  isPast,
}: {
  event: CalendarBriefEvent;
  showEndTime: boolean;
  isPast: boolean;
}) {
  const { locale } = useTranslation();
  const { icon, title } = iconAndTitle(event.title);
  const time = formatTime(event.startDate, locale === "no" ? "no" : "en");
  const endTime =
    showEndTime && event.endDate ? formatTime(event.endDate, locale === "no" ? "no" : "en") : null;

  return (
    <View
      className="flex-row items-start gap-3 py-2.5 border-b border-border/50"
      style={isPast ? { opacity: 0.45 } : undefined}
    >
      <Text className="text-2xs text-text3 font-bodySemi w-11 mt-0.5">
        {time}
        {endTime ? `\n${endTime}` : ""}
      </Text>
      <Text className="text-base mt-0.5">{icon}</Text>
      <View className="flex-1">
        <Text
          className="text-body-lg text-text1 font-bodyMedium"
          style={isPast ? { textDecorationLine: "line-through" } : undefined}
        >
          {title}
        </Text>
        {event.calendarName ? (
          <Text className="text-2xs text-text3 font-body mt-0.5">{event.calendarName}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function DayTimeline({
  timeline,
  isToday = false,
}: {
  timeline: DayTimelineData;
  isToday?: boolean;
}) {
  const { t } = useTranslation();
  const isEmpty = timeline.allDay.length === 0 && timeline.periods.length === 0;
  const now = Date.now();

  if (isEmpty) {
    return (
      <View className="bg-surface-2 rounded-lg p-4 mt-2">
        <Text className="text-body text-text2 font-body">{t("day.empty")}</Text>
      </View>
    );
  }

  return (
    <View>
      {timeline.allDay.length > 0 ? (
        <>
          <SectionLabel>{t("day.periods.allDay")}</SectionLabel>
          <View className="bg-card border border-border rounded-lg px-4">
            {timeline.allDay.map((event) => (
              <EventRow key={event.id} event={event} showEndTime={false} isPast={false} />
            ))}
          </View>
        </>
      ) : null}

      {timeline.periods.map((group) => (
        <View key={group.id}>
          <SectionLabel>{t(PERIOD_LABEL_KEY[group.id])}</SectionLabel>
          <View className="bg-card border border-border rounded-lg px-4">
            {group.events.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                showEndTime
                isPast={isToday && event.startDate.getTime() < now}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}
