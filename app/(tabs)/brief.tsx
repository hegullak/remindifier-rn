import { useAuth, useUser } from "@clerk/clerk-expo";
import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FALLBACK_TRAINING, HEADSUP_ITEMS, useBriefData } from "@/features/brief/useBriefData";
import { briefGreetingLine } from "@/lib/brief/greeting";
import { BRIEF_SECTION_LABELS, type BriefSectionId } from "@/lib/brief/sections";
import { anniversaryMilestoneDetail } from "@/lib/milestones/anniversaries";
import type { UpcomingRedLetterDay } from "@/lib/timeline/red-letter-days";
import { AppShell } from "@/ui/AppShell";
import { BottomSheet } from "@/ui/BottomSheet";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";

export default function BriefScreen() {
  const { user } = useUser();
  const { userId } = useAuth();
  const { brief, setSectionOrder, dateLine } = useBriefData(userId);
  const [showAllRedLetters, setShowAllRedLetters] = useState(false);
  const [weatherExpanded, setWeatherExpanded] = useState(false);
  const [anniversaryDetail, setAnniversaryDetail] = useState<{
    personName: string;
    years: number;
    norwegian: string | null;
    english: string | null;
  } | null>(null);

  const firstName = user?.firstName?.trim() || "there";
  const greeting = briefGreetingLine(firstName);
  const [greetingLead, greetingName] = greeting.split("\n");

  const todayRedLetters = brief.redLetterDays.filter((d) => d.isToday);
  const upcomingRedLetters = brief.redLetterDays.filter((d) => !d.isToday);
  const visibleUpcoming = showAllRedLetters ? upcomingRedLetters : upcomingRedLetters.slice(0, 2);
  const hiddenUpcomingCount = upcomingRedLetters.length - visibleUpcoming.length;

  const renderSection = useCallback(
    (sectionId: BriefSectionId) => {
      switch (sectionId) {
        case "weather":
          return (
            <View>
              <SectionLabel>{BRIEF_SECTION_LABELS[sectionId]}</SectionLabel>
              <Pressable onPress={() => setWeatherExpanded((v) => !v)}>
                <BriefCard stripeColor="blue">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-[28px] text-text1 font-heading">
                        {brief.weather.temp}
                      </Text>
                      <Text className="text-[13px] text-text2 font-body mt-1">
                        {brief.weather.description}
                      </Text>
                    </View>
                    <Text className="text-[28px]">{brief.weather.icon}</Text>
                  </View>
                  {weatherExpanded ? (
                    <View className="mt-3 pt-3 border-t border-border">
                      {brief.weather.goodForRun ? (
                        <Text className="text-[12px] text-green font-bodyMedium mb-3">
                          ✓ Good conditions for a run
                        </Text>
                      ) : null}
                      {brief.weather.details.map((d) => (
                        <View key={d.label} className="mb-2">
                          <Text className="text-[12px] text-text3 font-body">{d.label}</Text>
                          <Text className="text-[13px] text-text2 font-bodyMedium mt-0.5">
                            {d.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-[12px] text-accent font-bodyMedium mt-2">
                      Tap for details
                    </Text>
                  )}
                </BriefCard>
              </Pressable>
            </View>
          );
        case "schedule":
          return (
            <View>
              <SectionLabel>{BRIEF_SECTION_LABELS[sectionId]}</SectionLabel>
              <BriefCard stripeColor="blue">
                {brief.schedule.length === 0 ? (
                  <Text className="text-[13px] text-text3 font-body">Nothing scheduled.</Text>
                ) : (
                  brief.schedule.map((item, i) => (
                    <View key={item.id} className={i < brief.schedule.length - 1 ? "mb-3" : ""}>
                      <Text className="text-[12px] text-text3 font-bodyMedium">{item.time}</Text>
                      <Text className="text-[15px] text-text1 font-bodyMedium mt-1">
                        {item.title}
                      </Text>
                      <Text className="text-[12px] text-text3 font-body mt-1">{item.note}</Text>
                    </View>
                  ))
                )}
              </BriefCard>
            </View>
          );
        case "headsup":
          return (
            <View>
              <SectionLabel>{BRIEF_SECTION_LABELS[sectionId]}</SectionLabel>
              <BriefCard stripeColor="dusk">
                {HEADSUP_ITEMS.map((item, i) => (
                  <View key={item.day} className={i < HEADSUP_ITEMS.length - 1 ? "mb-3" : ""}>
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
              <SectionLabel>{BRIEF_SECTION_LABELS[sectionId]}</SectionLabel>
              <BriefCard stripeColor="green">
                {FALLBACK_TRAINING.map((line, i) => (
                  <Text
                    key={line}
                    className={`text-[15px] text-text1 font-bodyMedium${i < FALLBACK_TRAINING.length - 1 ? " mb-2" : ""}`}
                  >
                    {line}
                  </Text>
                ))}
              </BriefCard>
            </View>
          );
        case "red_letter":
          return (
            <View>
              <SectionLabel>{BRIEF_SECTION_LABELS[sectionId]}</SectionLabel>
              <BriefCard stripeColor="amber">
                {brief.redLetterDays.length === 0 ? (
                  <Text className="text-[13px] text-text3 font-body">
                    No red-letter days coming up.
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
                    {visibleUpcoming.map((item) => (
                      <RedLetterRow
                        key={item.id}
                        item={item}
                        onAnniversaryPress={setAnniversaryDetail}
                      />
                    ))}
                    {hiddenUpcomingCount > 0 ? (
                      <Pressable onPress={() => setShowAllRedLetters(true)} className="mt-2">
                        <Text className="text-[13px] text-accent font-bodyMedium">
                          +{hiddenUpcomingCount} more
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                )}
              </BriefCard>
            </View>
          );
        default:
          return null;
      }
    },
    [brief, hiddenUpcomingCount, todayRedLetters, visibleUpcoming, weatherExpanded],
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
      <Text className="text-[11px] text-text3 font-body mb-3">
        Hold and drag a section to reorder
      </Text>
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
        title="Wedding anniversary"
      >
        {anniversaryDetail ? (
          <View className="gap-3">
            <Text className="text-[15px] text-text1 font-bodyMedium">
              {anniversaryDetail.personName}
            </Text>
            <Text className="text-[13px] text-text2 font-body">
              {anniversaryDetail.years} years
            </Text>
            {anniversaryDetail.norwegian ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  Norwegian
                </Text>
                <Text className="text-[15px] text-amber font-bodySemi mt-1">
                  {anniversaryDetail.norwegian}
                </Text>
              </View>
            ) : null}
            {anniversaryDetail.english ? (
              <View>
                <Text className="text-[10px] uppercase tracking-[1.2px] text-text3 font-bodySemi">
                  English
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
