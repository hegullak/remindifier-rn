import { Link } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  FALLBACK_TRAINING,
  HEADSUP_ITEMS,
  useBriefData,
} from "@/features/brief/useBriefData";
import { BRIEF_SECTION_LABELS, type BriefSectionId } from "@/lib/brief/sections";
import { AppShell } from "@/ui/AppShell";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";
import { Tag } from "@/ui/Tag";

export default function BriefScreen() {
  const { userId } = useAuth();
  const { brief, moveSection, dateLine } = useBriefData(userId);
  const [showAllRedLetters, setShowAllRedLetters] = useState(false);

  const todayRedLetters = brief.redLetterDays.filter((d) => d.isToday);
  const upcomingRedLetters = brief.redLetterDays.filter((d) => !d.isToday);
  const visibleUpcoming = showAllRedLetters
    ? upcomingRedLetters
    : upcomingRedLetters.slice(0, 2);
  const hiddenUpcomingCount = upcomingRedLetters.length - visibleUpcoming.length;

  const renderSection = (sectionId: BriefSectionId) => {
    switch (sectionId) {
      case "weather":
        return (
          <View key={sectionId}>
            <SectionRow
              label={BRIEF_SECTION_LABELS[sectionId]}
              sectionId={sectionId}
              onMove={moveSection}
            />
            <BriefCard stripeColor="blue">
              <Text className="text-[28px] text-text1 font-heading">{brief.weather.temp}</Text>
              <Text className="text-[13px] text-text2 font-body mt-1">{brief.weather.description}</Text>
            </BriefCard>
          </View>
        );
      case "schedule":
        return (
          <View key={sectionId}>
            <SectionRow
              label={BRIEF_SECTION_LABELS[sectionId]}
              sectionId={sectionId}
              onMove={moveSection}
            />
            <BriefCard stripeColor="blue">
              {brief.schedule.length === 0 ? (
                <Text className="text-[13px] text-text3 font-body">Nothing scheduled.</Text>
              ) : (
                brief.schedule.map((item) => (
                  <View key={item.id} className="mb-3 last:mb-0">
                    <Text className="text-[12px] text-text3 font-bodyMedium">{item.time}</Text>
                    <Text className="text-[15px] text-text1 font-bodyMedium mt-1">{item.title}</Text>
                    <Text className="text-[12px] text-text3 font-body mt-1">{item.note}</Text>
                  </View>
                ))
              )}
            </BriefCard>
          </View>
        );
      case "headsup":
        return (
          <View key={sectionId}>
            <SectionRow
              label={BRIEF_SECTION_LABELS[sectionId]}
              sectionId={sectionId}
              onMove={moveSection}
            />
            <BriefCard stripeColor="dusk">
              {HEADSUP_ITEMS.map((item) => (
                <View key={item.day} className="mb-3 last:mb-0">
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
          <View key={sectionId}>
            <SectionRow
              label={BRIEF_SECTION_LABELS[sectionId]}
              sectionId={sectionId}
              onMove={moveSection}
            />
            <BriefCard stripeColor="green">
              {FALLBACK_TRAINING.map((line) => (
                <Text key={line} className="text-[15px] text-text1 font-bodyMedium mb-2 last:mb-0">
                  {line}
                </Text>
              ))}
            </BriefCard>
          </View>
        );
      case "red_letter":
        return (
          <View key={sectionId}>
            <SectionRow
              label={BRIEF_SECTION_LABELS[sectionId]}
              sectionId={sectionId}
              onMove={moveSection}
            />
            <BriefCard stripeColor="amber">
              {brief.redLetterDays.length === 0 ? (
                <Text className="text-[13px] text-text3 font-body">No red-letter days coming up.</Text>
              ) : (
                <>
                  {todayRedLetters.map((item) => (
                    <RedLetterRow key={item.id} item={item} />
                  ))}
                  {visibleUpcoming.map((item) => (
                    <RedLetterRow key={item.id} item={item} />
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
  };

  return (
    <AppShell>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
        <View className="pt-1 pb-2">
          <Text className="text-[12px] text-text3 font-body">{dateLine}</Text>
          <Text className="text-[30px] leading-[36px] text-text1 font-heading mt-1">
            Good morning,{"\n"}
            <Text className="text-accent">{brief.firstName}.</Text>
          </Text>
        </View>

        {brief.sectionOrder.map((sectionId) => renderSection(sectionId))}
      </ScrollView>
    </AppShell>
  );
}

function SectionRow({
  label,
  sectionId,
  onMove,
}: {
  label: string;
  sectionId: BriefSectionId;
  onMove: (id: BriefSectionId, direction: "up" | "down") => void;
}) {
  return (
    <View className="flex-row items-center justify-between mb-1">
      <SectionLabel>{label}</SectionLabel>
      <View className="flex-row gap-2">
        <Pressable onPress={() => onMove(sectionId, "up")} className="px-2 py-1">
          <Text className="text-[12px] text-text3 font-bodyMedium">↑</Text>
        </Pressable>
        <Pressable onPress={() => onMove(sectionId, "down")} className="px-2 py-1">
          <Text className="text-[12px] text-text3 font-bodyMedium">↓</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RedLetterRow({
  item,
}: {
  item: {
    id: string;
    personId: string | null;
    personName: string;
    headline: string;
    timing: string;
    icon: string;
    isToday: boolean;
  };
}) {
  const content = (
    <View className="mb-3 last:mb-0">
      <Text className="text-[15px] text-text1 font-bodyMedium">
        {item.icon} {item.personName}
      </Text>
      <Tag tone="amber" className="mt-1">
        {item.headline}
      </Tag>
      <Text className="text-[12px] text-text3 font-body mt-1">{item.timing}</Text>
    </View>
  );

  if (item.personId) {
    return (
      <Link href={`/people/${item.personId}`} asChild>
        <Pressable>{content}</Pressable>
      </Link>
    );
  }

  return content;
}
