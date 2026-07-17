import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { BriefTextCard } from "@/features/brief/BriefTextCard";
import { CalendarAccessNotice } from "@/features/brief/CalendarAccessNotice";
import { DayLoadCard } from "@/features/brief/DayLoadCard";
import { ImportantItemsCard } from "@/features/brief/ImportantItemsCard";
import { useBriefData } from "@/features/brief/useBriefData";
import { DayPickerHeader } from "@/features/day/DayPickerHeader";
import { DayTimeline } from "@/features/day/DayTimeline";
import { useDayData } from "@/features/day/useDayData";
import { useTranslation } from "@/i18n";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { interpretDay } from "@/lib/brief/interpretDay";
import { type MockDayScenario, mockDayEvents } from "@/lib/brief/mockDay";
import { AppShell } from "@/ui/AppShell";
import { SectionLabel } from "@/ui/SectionLabel";

type PreviewMode = "live" | MockDayScenario;
const DEV_PREVIEW_MODES: PreviewMode[] = ["live", "light", "moderate", "busy"];

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const { brief, calendarAccess } = useBriefData(userId);
  const dayData = useDayData(userId);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("live");

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  const lang = locale === "no" ? "no" : "en";

  const interpretation = useMemo(() => {
    let focusEvents: CalendarBriefEvent[];
    let weekEvents: CalendarBriefEvent[];

    if (previewMode === "live") {
      focusEvents = dayData.events;
      weekEvents = brief.weekEvents;
    } else {
      const mock = mockDayEvents(previewMode);
      focusEvents = mock;
      weekEvents = mock;
    }

    return interpretDay(focusEvents, weekEvents, lang, "morning");
  }, [previewMode, dayData.events, brief.weekEvents, lang]);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}>
        {/* Greeting */}
        <View style={{ paddingTop: 16, paddingBottom: 12 }}>
          <Text className="text-5xl leading-tight text-text1 font-heading">
            {greetingLead}
            {"\n"}
            <Text className="text-accent">{greetingName}</Text>
          </Text>
        </View>

        {/* Date picker */}
        {previewMode === "live" && (
          <DayPickerHeader
            dateLabel={dayData.dateLabel}
            dayOffset={dayData.dayOffset}
            onPrev={() => dayData.shiftDay(-1)}
            onNext={() => dayData.shiftDay(1)}
            onToday={dayData.goToToday}
          />
        )}

        {/* Calendar access notice */}
        {previewMode === "live" && (
          <CalendarAccessNotice
            access={calendarAccess}
            hasDevStubs={
              calendarAccess !== "granted" &&
              dayData.events.some((e) => e.id.startsWith("dev-stub-"))
            }
          />
        )}

        {/* Dev preview mode picker */}
        {__DEV__ && (
          <View className="flex-row gap-2 mt-3 mb-2">
            {DEV_PREVIEW_MODES.map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setPreviewMode(mode)}
                className={`px-3 py-1.5 rounded-pill border ${
                  previewMode === mode ? "border-accent bg-accentLight" : "border-border"
                }`}
              >
                <Text
                  className={`text-2xs uppercase tracking-[1px] font-bodySemi ${
                    previewMode === mode ? "text-accent" : "text-text3"
                  }`}
                >
                  {mode}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* 1. Day assessment */}
        <View className="mt-4">
          <DayLoadCard
            load={interpretation.load}
            label={interpretation.loadLabel}
            reason={interpretation.loadReason}
          />
        </View>

        {/* 2. Today's structure */}
        <BriefTextCard
          label={t("brief.cards.rhythm")}
          text={interpretation.rhythm}
          stripeColor="blue"
        />

        {/* 3. Breathing room */}
        <BriefTextCard
          label={t("brief.cards.breathingRoom")}
          text={interpretation.breathingRoom}
          stripeColor="green"
        />

        {/* 4. Today's timeline */}
        {dayData.timeline.allDay.length > 0 || dayData.timeline.periods.length > 0 ? (
          <View className="mt-4">
            <SectionLabel>{locale === "no" ? "Dagen min" : "My day"}</SectionLabel>
            <DayTimeline timeline={dayData.timeline} />
          </View>
        ) : null}

        {/* 5. Important today */}
        {interpretation.importantToday.length > 0 && (
          <ImportantItemsCard
            label={t("brief.cards.importantToday")}
            items={interpretation.importantToday}
            stripeColor="amber"
          />
        )}

        {/* 6. Important later this week */}
        {interpretation.laterThisWeek.length > 0 && (
          <ImportantItemsCard
            label={t("brief.cards.laterThisWeek")}
            items={interpretation.laterThisWeek}
            stripeColor="dusk"
            showDayLabel
          />
        )}

        {/* 7. Recommendation */}
        <BriefTextCard
          label={t("brief.cards.recommendation")}
          text={interpretation.recommendation}
          stripeColor="gold"
        />
      </ScrollView>
    </AppShell>
  );
}
