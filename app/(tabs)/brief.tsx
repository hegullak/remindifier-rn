import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { CalendarAccessNotice } from "@/features/brief/CalendarAccessNotice";
import { ImportantItemsCard } from "@/features/brief/ImportantItemsCard";
import { useBriefData } from "@/features/brief/useBriefData";
import { DayPickerHeader } from "@/features/day/DayPickerHeader";
import { DayTimeline } from "@/features/day/DayTimeline";
import { useDayData } from "@/features/day/useDayData";
import { useTranslation } from "@/i18n";
import { buildEveningWindDown } from "@/lib/brief/eveningWindDown";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { interpretDay } from "@/lib/brief/interpretDay";
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

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  const lang = locale === "no" ? "no" : "en";
  const isToday = dayData.dayOffset === 0;

  const morningBrief = buildMorningBrief(brief.todayEvents, brief.weekEvents, lang);
  const windDown = buildEveningWindDown(brief.tomorrowEvents, brief.weekEvents, lang);

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
    () => interpretDay(dayData.events, brief.weekEvents, lang, "morning").laterThisWeek,
    [dayData.events, brief.weekEvents, lang],
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

        {/* Ambient day narrative — morning 06-09 or evening 20:30+ only */}
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
        {dayData.timeline.allDay.length > 0 || dayData.timeline.periods.length > 0 ? (
          <View className="mt-4">
            <SectionLabel>{locale === "no" ? "Dagen min" : "My day"}</SectionLabel>
            <DayTimeline timeline={dayData.timeline} isToday={isToday} />
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
