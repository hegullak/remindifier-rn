import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { useBriefData } from "@/features/brief/useBriefData";
import { useTranslation } from "@/i18n";
import { isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { briefGatheringHref } from "@/lib/gatherings/briefLinks";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";
import { anniversaryMilestoneDetail } from "@/lib/milestones/anniversaries";
import type { UpcomingRedLetterDay } from "@/lib/timeline/red-letter-days";
import { buildEveningWindDown } from "@/lib/brief/eveningWindDown";
import { buildMorningBrief } from "@/lib/brief/morningBrief";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";

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
  const morningBrief = buildMorningBrief(brief.todayEvents ?? [], brief.weekEvents ?? [], locale);
  const windDown = buildEveningWindDown(brief.tomorrowEvents ?? [], brief.weekEvents ?? [], locale);
  const [showWeatherSheet, setShowWeatherSheet] = useState(false);
  const [showMorningBrief, setShowMorningBrief] = useState(false);
  const [showEveningWindDown, setShowEveningWindDown] = useState(false);
  const rainDetail = brief.weather.details.find((d) => d.kind === "rain");
  const rainText = rainDetail?.value ?? "0 mm";
  const windDetail = brief.weather.details.find((d) => d.kind === "wind");
  const windText = windDetail?.value ?? null;
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

  const privateCalendarEvents = brief.calendarEvents.filter((e) => {
    const name = (e.calendarName ?? "").toLowerCase();
    return name.includes("privat") || name.includes("private") || name.includes("personal");
  });

  function briefDayLabel(daysUntil: number): string {
    if (daysUntil === 0) return locale === "no" ? "I DAG" : "TODAY";
    if (daysUntil === 1) return locale === "no" ? "I MORGEN" : "TOMORROW";
    const d = new Date(today);
    d.setDate(today.getDate() + daysUntil);
    const label = d.toLocaleDateString(locale === "no" ? "nb-NO" : "en-GB", { weekday: "long" });
    return locale === "no" ? label.toUpperCase() : label.charAt(0).toUpperCase() + label.slice(1);
  }

  function renderDagenMin() {
    if (weekOffset !== 0) return null;
    const hasSchedule = brief.schedule.length > 0;
    const hasTraining = trainingLines.length > 0;
    if (!hasSchedule && !hasTraining) return null;
    return (
      <View className="mb-1">
        <SectionLabel>{locale === "no" ? "Dagen min" : "My day"}</SectionLabel>
        <BriefCard stripeColor="blue">
          {brief.schedule.map((item, i) => {
            const title = item.gatheringId
              ? localizeGatheringTitle(item.gatheringId, item.title, locale)
              : item.title;
            const row = (
              <View className={i < brief.schedule.length - 1 ? "mb-3" : ""}>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm">🕐</Text>
                  <Text className="text-xs text-text3 font-bodyMedium">{item.time}</Text>
                </View>
                <Text className="text-body-lg text-text1 font-bodyMedium mt-1 pl-6">{title}</Text>
                {item.note ? (
                  <Text className="text-xs text-text3 font-body mt-1 pl-6">{item.note}</Text>
                ) : null}
              </View>
            );
            return (
              <Link key={item.id} href={briefGatheringHref(item.gatheringId, title)} asChild>
                <Pressable className="active:opacity-70">{row}</Pressable>
              </Link>
            );
          })}
          {hasSchedule && hasTraining && <View className="h-px bg-border my-3" />}
          {trainingLines.map((line, i) => (
            <View key={line} className={`flex-row items-start gap-2${i < trainingLines.length - 1 ? " mb-3" : ""}`}>
              <Text className="text-base">{i === 0 ? "🏋️" : "🏃"}</Text>
              <Text className="text-body-lg text-text1 font-body flex-1">{line}</Text>
            </View>
          ))}
        </BriefCard>
      </View>
    );
  }

  function renderUkenMin() {
    type UnifiedItem = {
      id: string;
      sortKey: number;
      dayLabel: string;
      icon: string;
      primary: string;
      secondary?: string;
      href?: Parameters<typeof briefGatheringHref>[0] extends infer H ? H : string;
      gatheringId?: string | null;
      onPress?: () => void;
    };

    const items: UnifiedItem[] = [];

    for (const event of privateCalendarEvents) {
      const eventDay = new Date(event.startDate);
      eventDay.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((eventDay.getTime() - today.getTime()) / 86400000);
      const title = event.gatheringId
        ? localizeGatheringTitle(event.gatheringId, event.title, locale)
        : event.title;
      const timeStr = event.allDay
        ? undefined
        : event.startDate.toLocaleTimeString(locale === "no" ? "nb-NO" : "en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
      items.push({
        id: `cal-${event.id}`,
        sortKey: daysUntil,
        dayLabel: briefDayLabel(daysUntil),
        icon: "🕐",
        primary: title,
        secondary: timeStr,
        gatheringId: event.gatheringId,
      });
    }

    for (const rld of redLettersThisWeek) {
      items.push({
        id: `rld-${rld.id}`,
        sortKey: rld.daysUntil,
        dayLabel: briefDayLabel(rld.daysUntil),
        icon: rld.icon,
        primary: rld.personName,
        secondary: rld.headline,
        href: rld.personId ? `/people/${rld.personId}` : undefined,
        onPress: rld.kind === "Anniversary"
          ? () => {
              const m = anniversaryMilestoneDetail(rld.eventDate);
              if (m) setAnniversaryDetail({ personName: rld.personName, years: m.years, norwegian: m.norwegian, english: m.english });
            }
          : undefined,
      });
    }

    if (weekOffset === 0) {
      for (const item of headsupItems) {
        items.push({
          id: `headsup-${item.day}`,
          sortKey: item.daysUntil,
          dayLabel: item.day,
          icon: "💡",
          primary: item.text,
        });
      }
    }

    items.sort((a, b) => a.sortKey - b.sortKey);

    if (items.length === 0) return null;

    let lastDay = "";
    return (
      <View className="mb-1">
        <SectionLabel>{locale === "no" ? "Uken min" : "My week"}</SectionLabel>
        <BriefCard stripeColor="sage">
          {items.map((item, i) => {
            const showDayLabel = item.dayLabel !== lastDay;
            lastDay = item.dayLabel;
            const row = (
              <View key={item.id} className={i < items.length - 1 ? "mb-3" : ""}>
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
                      <Text className="text-xs text-text3 font-body mt-0.5">{item.secondary}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
            if (item.gatheringId || item.href) {
              const href = item.gatheringId
                ? briefGatheringHref(item.gatheringId, item.primary)
                : (item.href as string);
              return (
                <Link key={item.id} href={href} asChild>
                  <Pressable className="active:opacity-70">{row}</Pressable>
                </Link>
              );
            }
            if (item.onPress) {
              return (
                <Pressable key={item.id} onPress={item.onPress} className="active:opacity-70">
                  {row}
                </Pressable>
              );
            }
            return <View key={item.id}>{row}</View>;
          })}
        </BriefCard>
      </View>
    );
  }

  // Ambient brief: morgen 06–09, kveld 20:30+
  const ambientPeriod = (() => {
    const h = new Date().getHours();
    const m = new Date().getMinutes();
    if (h >= 6 && h < 15) return "morning";   // TEMP: utvidet for testing
    if (h >= 15) return "evening";             // TEMP: utvidet for testing
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
    const src = ambientPeriod === "morning" ? morningBrief : ambientPeriod === "evening" ? windDown : null;
    if (!src?.available || src.isEmpty || !ambientHeadline) return [];
    const sentences = src.body.split("\n").filter(Boolean);
    const find = (kw: string) => sentences.find(s => s.toLowerCase().includes(kw));
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
      <View style={{ paddingTop: 32, paddingBottom: ambientHeadline ? 6 : 16 }}>
        <Text className="text-5xl leading-tight text-text1 font-heading">
          {greetingLead}{" "}
          <Text className="text-accent">{greetingName}</Text>
        </Text>
      </View>

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

      {/* Datovelger */}
      <View className="flex-row items-center gap-3 mb-4">
        <Pressable
          onPress={() => shiftWeek(-1)}
          accessibilityRole="button"
          accessibilityLabel={t("brief.weekPrev")}
          hitSlop={16}
          className="active:opacity-60"
        >
          <Text className="text-xl text-accent font-body">←</Text>
        </Pressable>
        <Pressable
          onPress={resetWeek}
          disabled={weekOffset === 0}
          accessibilityRole="button"
          accessibilityLabel={t("brief.weekThis")}
          hitSlop={8}
          className="active:opacity-70"
        >
          <Text
            className={`text-base font-bodySemi ${weekOffset === 0 ? "text-text3" : "text-accent"}`}
          >
            {dateLine}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => shiftWeek(1)}
          accessibilityRole="button"
          accessibilityLabel={t("brief.weekNext")}
          hitSlop={16}
          className="active:opacity-60"
        >
          <Text className="text-xl text-accent font-body">→</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <AppShell
      headerLeft={
        <Pressable
          onPress={() => setShowWeatherSheet(true)}
          className="flex-row items-center active:opacity-70"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Text className="text-2xl mr-1">{brief.weather.icon}</Text>
          <Text className="text-base text-text2 font-bodyMedium">{brief.weather.temp}</Text>
          <Text className="text-body-lg text-text3 font-body">  🌧️ {rainText}</Text>
          {windText ? (
            <Text className="text-body-lg text-text3 font-body">  💨 {windText}</Text>
          ) : null}
          <Text className="text-body text-text3 font-body ml-1">›</Text>
        </Pressable>
      }
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
      >
        {listHeader}
        {renderDagenMin()}
        {renderUkenMin()}
      </ScrollView>

      <BottomSheet
        visible={showMorningBrief}
        onDismiss={() => setShowMorningBrief(false)}
        title={t("brief.morningBrief.sectionLabel")}
        large
      >
        <Text className="text-xl text-text1 font-heading mb-5 leading-[28px]">{morningBrief.headline}</Text>
        {morningBrief.body.split("\n").filter(Boolean).map((sentence, i) => (
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
        <Text className="text-xl text-text1 font-heading mb-5 leading-[28px]">{windDown.headline}</Text>
        {windDown.body.split("\n").filter(Boolean).map((sentence, i) => (
          <Text key={i} className="text-body-lg text-text2 font-body leading-[24px] mb-2">
            {sentence}
          </Text>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={showWeatherSheet}
        onDismiss={() => setShowWeatherSheet(false)}
        title={`${brief.weather.icon} ${brief.weather.locationLabel}`}
        large
      >
        <View className="flex-row items-end gap-3 mb-4">
          <Text className="text-[48px] leading-[52px] text-text1 font-heading">
            {brief.weather.temp}
          </Text>
          <Text className="text-body-lg text-text2 font-body mb-2 flex-1">
            {brief.weather.description}
          </Text>
        </View>
        {brief.weather.goodForRun ? (
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-base">🏃</Text>
            <Text className="text-body text-green font-bodyMedium flex-1">
              {t("brief.goodForRun")}
            </Text>
          </View>
        ) : null}
        <View className="flex-row flex-wrap gap-x-4 gap-y-4">
          {brief.weather.details.map((d) => (
            <View key={`${d.icon}-${d.label}`} className="w-[46%] min-w-[140px]">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Text className="text-body-lg">{d.icon}</Text>
                <Text className="text-3xs text-text3 font-bodySemi uppercase tracking-wide">
                  {d.label}
                </Text>
              </View>
              <Text className="text-body-lg text-text1 font-bodyMedium pl-5">{d.value}</Text>
            </View>
          ))}
        </View>
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

function RedLetterRow({
  item,
  onAnniversaryPress,
}: {
  item: UpcomingRedLetterDay;
  onAnniversaryPress: (detail: {
    personName: string;
    years: number;
    norwegian: string | null;
    english: string | null;
  }) => void;
}) {
  const milestone = item.kind === "Anniversary" ? anniversaryMilestoneDetail(item.eventDate) : null;

  const headline = milestone ? (
    <Pressable
      onPress={() =>
        onAnniversaryPress({
          personName: item.personName,
          years: milestone.years,
          norwegian: milestone.norwegian,
          english: milestone.english,
        })
      }
      hitSlop={4}
    >
      <Text className="text-2xs uppercase tracking-[1.2px] text-amber font-bodySemi mt-1 underline">
        {item.headline}
      </Text>
    </Pressable>
  ) : (
    <Text className="text-2xs uppercase tracking-[1.2px] text-amber font-bodySemi mt-1">
      {item.headline}
    </Text>
  );

  return (
    <View className="mb-3">
      {item.personId ? (
        <Link href={`/people/${item.personId}`} asChild>
          <Pressable>
            <Text className="text-body-lg text-text1 font-bodyMedium">
              {item.icon} {item.personName}
            </Text>
          </Pressable>
        </Link>
      ) : (
        <Text className="text-body-lg text-text1 font-bodyMedium">
          {item.icon} {item.personName}
        </Text>
      )}
      {headline}
      <Text className="text-body text-text2 font-body mt-0.5">{item.timing}</Text>
    </View>
  );
}
