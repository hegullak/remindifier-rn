import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { BriefDateHeader } from "@/features/brief/BriefDateHeader";
import { BriefTextCard } from "@/features/brief/BriefTextCard";
import { CalendarAccessNotice } from "@/features/brief/CalendarAccessNotice";
import { DayLoadCard } from "@/features/brief/DayLoadCard";
import { ImportantItemsCard } from "@/features/brief/ImportantItemsCard";
import { useBriefData } from "@/features/brief/useBriefData";
import { useTranslation } from "@/i18n";
import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { interpretDay } from "@/lib/brief/interpretDay";
import { type MockDayScenario, mockDayEvents } from "@/lib/brief/mockDay";
import { AppShell } from "@/ui/AppShell";

type PreviewMode = "live" | MockDayScenario;
const DEV_PREVIEW_MODES: PreviewMode[] = ["live", "light", "moderate", "busy"];

/** Evening from 18:00 switches Briefs to a tomorrow-focused variant. */
const EVENING_HOUR = 18;

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const { userId } = useAppAuth();
  const { brief, calendarAccess } = useBriefData(userId);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("live");

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  const lang = locale === "no" ? "no" : "en";
  const isEvening = new Date().getHours() >= EVENING_HOUR;

  const interpretation = useMemo(() => {
    const period = isEvening ? "evening" : "morning";
    let focusEvents: CalendarBriefEvent[];
    let weekEvents: CalendarBriefEvent[];

    if (previewMode === "live") {
      focusEvents = isEvening ? brief.tomorrowEvents : brief.todayEvents;
      weekEvents = brief.weekEvents;
    } else {
      const mock = mockDayEvents(previewMode);
      focusEvents = mock;
      weekEvents = mock;
    }

    return interpretDay(focusEvents, weekEvents, lang, period);
  }, [previewMode, isEvening, brief.todayEvents, brief.tomorrowEvents, brief.weekEvents, lang]);

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}>
        {/* Greeting — visual anchor */}
        <View style={{ paddingTop: 16, paddingBottom: 4 }}>
          <Text className="text-5xl leading-tight text-text1 font-heading">
            {greetingLead}
            {"\n"}
            <Text className="text-accent">{greetingName}</Text>
          </Text>
        </View>

        <BriefDateHeader />

        {previewMode === "live" ? (
          <CalendarAccessNotice
            access={calendarAccess}
            hasDevStubs={
              calendarAccess !== "granted" &&
              brief.calendarEvents.some((e) => e.id.startsWith("dev-stub-"))
            }
          />
        ) : null}

        {__DEV__ ? (
          <View className="flex-row gap-2 mt-3 mb-1">
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
        ) : null}

        <View className="mt-4">
          {/* 1. Dagens vurdering */}
          <DayLoadCard
            load={interpretation.load}
            label={interpretation.loadLabel}
            reason={interpretation.loadReason}
          />
        </View>

        {/* 2. Dagens rytme */}
        <BriefTextCard
          label={t("brief.cards.rhythm")}
          text={interpretation.rhythm}
          stripeColor="blue"
        />

        {/* 3. Pusterom */}
        <BriefTextCard
          label={t("brief.cards.breathingRoom")}
          text={interpretation.breathingRoom}
          stripeColor="green"
        />

        {/* 4. Viktig i dag */}
        <ImportantItemsCard
          label={t("brief.cards.importantToday")}
          items={interpretation.importantToday}
          stripeColor="amber"
        />

        {/* 5. Viktig senere i uken */}
        <ImportantItemsCard
          label={t("brief.cards.laterThisWeek")}
          items={interpretation.laterThisWeek}
          stripeColor="dusk"
          showDayLabel
        />

        {/* 6. Myk anbefaling */}
        <BriefTextCard
          label={t("brief.cards.recommendation")}
          text={interpretation.recommendation}
          stripeColor="gold"
        />
      </ScrollView>
    </AppShell>
  );
}
