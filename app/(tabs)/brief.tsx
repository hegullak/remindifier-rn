import { useAuth, useUser } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useBriefData } from "@/features/brief/useBriefData";
import { useTranslation } from "@/i18n";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { briefSectionLabelKey } from "@/lib/brief/sectionLabels";
import type { BriefSectionId } from "@/lib/brief/sections";
import { getCalendarWeekBounds, isDateInCalendarWeek } from "@/lib/brief/calendarWeek";
import { anniversaryMilestoneDetail } from "@/lib/milestones/anniversaries";
import type { UpcomingRedLetterDay } from "@/lib/timeline/red-letter-days";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";

export default function BriefScreen() {
  const { t, locale } = useTranslation();
  const { user } = useUser();
  const { userId } = useAuth();
  const { brief, setSectionOrder, dateLine, headsupItems, trainingLines } = useBriefData(userId);
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [anniversaryDetail, setAnniversaryDetail] = useState<{
    personName: string;
    years: number;
    norwegian: string | null;
    english: string | null;
  } | null>(null);

  const firstName = user?.firstName?.trim() || (locale === "no" ? "du" : "there");
  const greeting = briefGreetingLine(firstName, locale);
  const [greetingLead, greetingName] = greeting.split("\n");

  const weekBounds = getCalendarWeekBounds();
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
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <Pressable onPress={() => setWeatherExpanded((v) => !v)}>
                <BriefCard stripeColor="blue">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="text-[11px] text-text3 font-body mb-1">
                        📍 {brief.weather.locationLabel}
                      </Text>
                      <View className="flex-row items-end gap-2">
                        <Text className="text-[36px] leading-[40px] text-text1 font-heading">
                          {brief.weather.temp}
                        </Text>
                        <Text className="text-[28px] pb-1">{brief.weather.icon}</Text>
                      </View>
                      <Text className="text-[13px] text-text2 font-body mt-1">
                        {brief.weather.description}
                      </Text>
                    </View>
                  </View>
                  {weatherExpanded ? (
                    <View className="mt-3 pt-3 border-t border-border">
                      {brief.weather.goodForRun ? (
                        <View className="flex-row items-center gap-2 mb-3">
                          <Text className="text-[16px]">🏃</Text>
                          <Text className="text-[12px] text-green font-bodyMedium flex-1">
                            {t("brief.goodForRun")}
                          </Text>
                        </View>
                      ) : null}
                      <View className="flex-row flex-wrap gap-x-4 gap-y-3">
                        {brief.weather.details.map((d) => (
                          <View key={`${d.icon}-${d.label}`} className="w-[46%] min-w-[140px]">
                            <View className="flex-row items-center gap-1.5 mb-0.5">
                              <Text className="text-[15px]">{d.icon}</Text>
                              <Text className="text-[11px] text-text3 font-bodySemi uppercase tracking-wide">
                                {d.label}
                              </Text>
                            </View>
                            <Text className="text-[14px] text-text1 font-bodyMedium pl-5">
                              {d.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                      <Text className="text-[12px] text-accent font-bodyMedium mt-3">
                        {t("brief.hideDetails")}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[12px] text-accent font-bodyMedium mt-2">
                      {t("brief.tapForDetails")}
                    </Text>
                  )}
                </BriefCard>
              </Pressable>
            </View>
          );
        case "schedule":
          return (
            <View>
              <SectionLabel>{t(briefSectionLabelKey(sectionId))}</SectionLabel>
              <BriefCard stripeColor="blue">
                {brief.schedule.length === 0 ? (
                  <Text className="text-[13px] text-text3 font-body">
                    {t("brief.scheduleEmpty")}
                  </Text>
                ) : (
                  brief.schedule.map((item, i) => (
                    <View key={item.id} className={i < brief.schedule.length - 1 ? "mb-3" : ""}>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-[14px]">🕐</Text>
                        <Text className="text-[12px] text-text3 font-bodyMedium">{item.time}</Text>
                      </View>
                      <Text className="text-[15px] text-text1 font-bodyMedium mt-1 pl-6">
                        {item.title}
                      </Text>
                      {item.note ? (
                        <Text className="text-[12px] text-text3 font-body mt-1 pl-6">
                          {item.note}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )}
              </BriefCard>
            </View>
          );
        case "headsup":
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
    [brief, headsupItems, redLettersThisWeek, todayRedLetters, trainingLines, upcomingRedLetters, weatherExpanded, t],
  );

  const listHeader = (
    <View className="pb-2">
      <View className="pt-1 pb-2">
        <Text className="text-[12px] text-text3 font-body">{dateLine}</Text>
        <Text className="text-[30px] leading-[36px] text-text1 font-heading mt-1">
          {greetingLead}
          {"\n"}
          <Text className="text-accent">{greetingName}</Text>
        </Text>
      </View>
      <Text className="text-[11px] text-text3 font-body mb-3">{t("brief.reorderHint")}</Text>
    </View>
  );

  return (
    <AppShell>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DraggableFlatList
          data={brief.sectionOrder}
          keyExtractor={(item) => item}
          onDragEnd={({ data }) => {
            void setSectionOrder(data);
          }}
          activationDistance={12}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
          ListHeaderComponent={listHeader}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator>
              <Pressable
                onLongPress={drag}
                delayLongPress={180}
                disabled={isActive}
                className={`mb-1 ${isActive ? "opacity-90" : ""}`}
              >
                {renderSection(item)}
              </Pressable>
            </ScaleDecorator>
          )}
        />
      </GestureHandlerRootView>

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
