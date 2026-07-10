import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppUser } from "@/features/auth/useAppAuth";
import { BriefDateHeader } from "@/features/brief/BriefDateHeader";
import { BriefTextCard } from "@/features/brief/BriefTextCard";
import { DayLoadCard } from "@/features/brief/DayLoadCard";
import { ImportantItemsCard } from "@/features/brief/ImportantItemsCard";
import { useTranslation } from "@/i18n";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { interpretDay } from "@/lib/brief/interpretDay";
import { type MockDayScenario, mockDayEvents } from "@/lib/brief/mockDay";
import { AppShell } from "@/ui/AppShell";

const SCENARIOS: MockDayScenario[] = ["light", "moderate", "busy"];

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useAppUser();
  const [scenario, setScenario] = useState<MockDayScenario>("moderate");

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const { lead: greetingLead, name: greetingName } = briefGreetingLine(firstName, locale);

  const lang = locale === "no" ? "no" : "en";
  const interpretation = useMemo(() => {
    const events = mockDayEvents(scenario);
    return interpretDay(events, events, lang, "morning");
  }, [scenario, lang]);

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

        {__DEV__ ? (
          <View className="flex-row gap-2 mt-3 mb-1">
            {SCENARIOS.map((s) => (
              <Pressable
                key={s}
                onPress={() => setScenario(s)}
                className={`px-3 py-1.5 rounded-pill border ${
                  scenario === s ? "border-accent bg-accentLight" : "border-border"
                }`}
              >
                <Text
                  className={`text-2xs uppercase tracking-[1px] font-bodySemi ${
                    scenario === s ? "text-accent" : "text-text3"
                  }`}
                >
                  {s}
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
