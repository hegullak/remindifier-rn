import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useAppAuth, useAppUser } from "@/features/auth/useAppAuth";
import { useBriefData } from "@/features/brief/useBriefData";
import { useTranslation } from "@/i18n";
import { formatCalendarEventTiming } from "@/lib/brief/calendarEvents";
import { isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { briefSectionLabelKey } from "@/lib/brief/sectionLabels";
import type { BriefSectionId } from "@/lib/brief/sections";
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
    setSectionOrder,
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
  const rainDetail = brief.weather.details.find((d) => d.icon === "🌧️");
  const rainText = rainDetail?.value ?? "0 mm";
  const windDetail = brief.weather.details.find((d) => d.icon === "💨");
  const windText = windDetail?.value ?? null;
  const [anniversaryDetail, setAnniversaryDetail] = useState<{
    personName: string;
    years: number;
    norwegian: string | null;
    english: string | null;
  } | null>(null);

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const greeting = briefGreetingLine(firstName, locale);
  const [greetingLead, greetingName] = greeting.split("\n");

  const redLettersThisWeek = brief.redLetterDays.filter((item) => {
    const next = new Date();
    next.setHours(0, 0, 0, 0);
    next.setDate(next.getDate() + item.daysUntil);
    return isDateInCalendarWeek(next, weekBounds);
  });
  const todayRedLetters = redLettersThisWeek.filter((d) => d.isToday);
  const upcomingRedLetters = redLettersThisWeek.filter((d) => !d.isToday);

  const renderSection = useCallback(
    (sectionId: BriefSectionId) => {
      switch (sectionId) {
        case "weather":
          return null;
        case "schedule":
          if (weekOffset !== 0) return null;
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <BriefCard stripeColor="blue">
                {brief.schedule.length === 0 ? (
                  <Text className="text-[13px] text-text3 font-body">
                    {t("brief.scheduleEmpty")}
                  </Text>
                ) : (
                  brief.schedule.map((item, i) => {
                    const title = item.gatheringId
                      ? localizeGatheringTitle(item.gatheringId, item.title, locale)
                      : item.title;
                    const row = (
                      <View className={i < brief.schedule.length - 1 ? "mb-3" : ""}>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-[14px]">🕐</Text>
                          <Text className="text-[12px] text-text3 font-bodyMedium">{item.time}</Text>
                        </View>
                        <Text className="text-[15px] text-text1 font-bodyMedium mt-1 pl-6">
                          {title}
                        </Text>
                        {item.note ? (
                          <Text className="text-[12px] text-text3 font-body mt-1 pl-6">
                            {item.note}
                          </Text>
                        ) : null}
                      </View>
                    );
                    return (
                      <Link
                        key={item.id}
                        href={briefGatheringHref(item.gatheringId, title)}
                        asChild
                      >
                        <Pressable className="active:opacity-70">{row}</Pressable>
                      </Link>
                    );
                  })
                )}
              </BriefCard>
            </View>
          );
        case "calendar": {
          const privateCalendarEvents = brief.calendarEvents.filter((e) => {
            const name = (e.calendarName ?? "").toLowerCase();
            // Only show explicitly private events — block work calendars
            return name.includes("privat") || name.includes("private") || name.includes("personal");
          });
          if (privateCalendarEvents.length === 0) return null;
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <BriefCard stripeColor="sage">
                {privateCalendarEvents.map((event, i) => {
                  const title = event.gatheringId
                    ? localizeGatheringTitle(event.gatheringId, event.title, locale)
                    : event.title;
                  const row = (
                    <View className={i < privateCalendarEvents.length - 1 ? "mb-3" : ""}>
                      <Text className="text-[11px] uppercase tracking-[1.2px] text-sage font-bodySemi">
                        {formatCalendarEventTiming(event, weekOffset, locale, t)}
                      </Text>
                      <Text className="text-[15px] text-text1 font-bodyMedium mt-1">{title}</Text>
                      {!event.allDay ? (
                        <Text className="text-[12px] text-text3 font-body mt-0.5">
                          {event.startDate.toLocaleTimeString(
                            locale === "no" ? "nb-NO" : "en-GB",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </Text>
                      ) : null}
                    </View>
                  );
                  return (
                    <Link
                      key={event.id}
                      href={briefGatheringHref(event.gatheringId, title)}
                      asChild
                    >
                      <Pressable className="active:opacity-70">{row}</Pressable>
                    </Link>
                  );
                })}
              </BriefCard>
            </View>
          );
        }
        case "headsup":
          if (weekOffset !== 0) return null;
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <BriefCard stripeColor="dusk">
                {headsupItems.map((item, i) => (
                  <View key={item.day} className={i < headsupItems.length - 1 ? "mb-3" : ""}>
                    <Text className="text-[11px] uppercase tracking-[1.2px] text-dusk font-bodySemi">
                      {item.day}
                    </Text>
                    <Text className="text-[14px] text-text2 font-body mt-1">{item.text}</Text>
                  </View>
                ))}
              </BriefCard>
            </View>
          );
        case "training":
          if (weekOffset !== 0) return null;
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <BriefCard stripeColor="green">
                {trainingLines.map((line, i) => (
                  <View
                    key={line}
                    className={`flex-row items-start gap-2${i < trainingLines.length - 1 ? " mb-3" : ""}`}
                  >
                    <Text className="text-[16px]">{i === 0 ? "🏋️" : "🏃"}</Text>
                    <Text className="text-[15px] text-text1 font-body flex-1">{line}</Text>
                  </View>
                ))}
              </BriefCard>
            </View>
          );
        case "red_letter":
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <BriefCard stripeColor="amber">
                {redLettersThisWeek.length === 0 ? (
                  <Text className="text-[13px] text-text3 font-body">
                    {t("brief.merkedagerEmpty")}
                  </Text>
                ) : (
                  <>
                    {todayRedLetters.map((item) => (
                      <RedLetterRow
                        key={item.id}
                        item={item}
                        onAnniversaryPress={setAnniversaryDetail}
                      />
                    ))}
                    {upcomingRedLetters.map((item) => (
                      <RedLetterRow
                        key={item.id}
                        item={item}
                        onAnniversaryPress={setAnniversaryDetail}
                      />
                    ))}
                  </>
                )}
              </BriefCard>
            </View>
          );
        default:
          return null;
      }
    },
    [
      brief,
      headsupItems,
      redLettersThisWeek,
      todayRedLetters,
      trainingLines,
      upcomingRedLetters,
      weekOffset,
      locale,
      t,
    ],
  );

  const morningPillText = morningBrief.available
    ? morningBrief.isEmpty
      ? t("brief.morningBrief.pillEmpty")
      : morningBrief.pillText
    : t("brief.morningBrief.pillUnavailable");

  const eveningPillText = !windDown.available
    ? t("brief.eveningWindDown.pillUnavailable")
    : windDown.isEmpty
      ? t("brief.eveningWindDown.pillEmpty")
      : windDown.pillText;

  const listHeader = (
    <View className="pb-2">
      <Pressable
        onPress={() => setShowWeatherSheet(true)}
        className="flex-row items-center justify-center mb-2 active:opacity-70"
        accessibilityRole="button"
        hitSlop={8}
      >
        <Text className="text-[15px] mr-0.5">{brief.weather.icon}</Text>
        <Text className="text-[14px] text-text1 font-bodyMedium">{brief.weather.temp}</Text>
        <Text className="text-[13px] text-text3 font-body">  🌧️ {rainText}</Text>
        {windText ? (
          <Text className="text-[13px] text-text3 font-body">  💨 {windText}</Text>
        ) : null}
        <Text className="text-[13px] text-text3 font-body ml-1">›</Text>
      </Pressable>

      <View className="flex-row items-center justify-center gap-4 mb-2">
        <Pressable
          onPress={() => shiftWeek(-1)}
          accessibilityRole="button"
          accessibilityLabel={t("brief.weekPrev")}
          hitSlop={16}
          className="active:opacity-60"
        >
          <Text className="text-[22px] text-accent font-body">←</Text>
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
            className={`text-[13px] font-bodySemi ${weekOffset === 0 ? "text-text3" : "text-accent"}`}
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
          <Text className="text-[22px] text-accent font-body">→</Text>
        </Pressable>
      </View>
      <View className="pt-6 pb-8">
        <Text className="text-5xl leading-tight text-text1 font-heading">
          {greetingLead}{" "}
          <Text className="text-accent">{greetingName}</Text>
        </Text>
      </View>

      <View className="flex-row gap-2 mb-3">
        <Pressable
          onPress={() => setShowMorningBrief(true)}
          className="flex-1 active:opacity-70"
          accessibilityRole="button"
        >
          <View className="bg-card border border-border rounded-[18px] px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
                {t("brief.morningBrief.sectionLabel")}
              </Text>
              <Text className="text-[14px] text-text1 font-bodyMedium mt-0.5" numberOfLines={1}>
                {morningPillText}
              </Text>
            </View>
            <Text className="text-[18px] text-text3 font-body">›</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => setShowEveningWindDown(true)}
          className="flex-1 active:opacity-70"
          accessibilityRole="button"
        >
          <View className="bg-card border border-border rounded-[18px] px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] uppercase tracking-[1.5px] text-text3 font-bodySemi">
                {t("brief.eveningWindDown.sectionLabel")}
              </Text>
              <Text className="text-[14px] text-text1 font-bodyMedium mt-0.5" numberOfLines={1}>
                {eveningPillText}
              </Text>
            </View>
            <Text className="text-[18px] text-text3 font-body">›</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );

  return (
    <AppShell>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
      >
        {listHeader}
        {brief.sectionOrder.map((sectionId) => (
          <View key={sectionId} className="mb-1">
            {renderSection(sectionId)}
          </View>
        ))}
      </ScrollView>

      <BottomSheet
        visible={showMorningBrief}
        onDismiss={() => setShowMorningBrief(false)}
        title={t("brief.morningBrief.sectionLabel")}
        large
      >
        <Text className="text-[20px] text-text1 font-heading mb-5 leading-[28px]">{morningBrief.headline}</Text>
        {morningBrief.body.split("\n").filter(Boolean).map((sentence, i) => (
          <Text key={i} className="text-[15px] text-text2 font-body leading-[24px] mb-2">
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
        <Text className="text-[20px] text-text1 font-heading mb-5 leading-[28px]">{windDown.headline}</Text>
        {windDown.body.split("\n").filter(Boolean).map((sentence, i) => (
          <Text key={i} className="text-[15px] text-text2 font-body leading-[24px] mb-2">
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
          <Text className="text-[15px] text-text2 font-body mb-2 flex-1">
            {brief.weather.description}
          </Text>
        </View>
        {brief.weather.goodForRun ? (
          <View className="flex-row items-center gap-2 mb-4">
            <Text className="text-[16px]">🏃</Text>
            <Text className="text-[13px] text-green font-bodyMedium flex-1">
              {t("brief.goodForRun")}
            </Text>
          </View>
        ) : null}
        <View className="flex-row flex-wrap gap-x-4 gap-y-4">
          {brief.weather.details.map((d) => (
            <View key={`${d.icon}-${d.label}`} className="w-[46%] min-w-[140px]">
              <View className="flex-row items-center gap-1.5 mb-0.5">
                <Text className="text-[15px]">{d.icon}</Text>
                <Text className="text-[11px] text-text3 font-bodySemi uppercase tracking-wide">
                  {d.label}
                </Text>
              </View>
              <Text className="text-[15px] text-text1 font-bodyMedium pl-5">{d.value}</Text>
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
            <Text className="text-[15px] text-text1 font-bodyMedium">
              {anniversaryDetail.personName}
            </Text>
            <Text className="text-[13px] text-text2 font-body">
              {t("brief.anniversarySheet.years", { count: anniversaryDetail.years })}
            </Text>
            {anniversaryDetail.norwegian ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  {t("brief.anniversarySheet.norwegianLabel")}
                </Text>
                <Text className="text-[15px] text-amber font-bodySemi mt-1">
                  {anniversaryDetail.norwegian}
                </Text>
              </View>
            ) : null}
            {anniversaryDetail.english ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  {t("brief.anniversarySheet.englishLabel")}
                </Text>
                <Text className="text-[15px] text-text1 font-bodyMedium mt-1">
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
      <Text className="text-[10px] uppercase tracking-[1.2px] text-amber font-bodySemi mt-1 underline">
        {item.headline}
      </Text>
    </Pressable>
  ) : (
    <Text className="text-[10px] uppercase tracking-[1.2px] text-amber font-bodySemi mt-1">
      {item.headline}
    </Text>
  );

  return (
    <View className="mb-3">
      {item.personId ? (
        <Link href={`/people/${item.personId}`} asChild>
          <Pressable>
            <Text className="text-[15px] text-text1 font-bodyMedium">
              {item.icon} {item.personName}
            </Text>
          </Pressable>
        </Link>
      ) : (
        <Text className="text-[15px] text-text1 font-bodyMedium">
          {item.icon} {item.personName}
        </Text>
      )}
      {headline}
      <Text className="text-[13px] text-text2 font-body mt-0.5">{item.timing}</Text>
    </View>
  );
}
