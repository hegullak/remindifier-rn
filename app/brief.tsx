import { Link } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { SafeAreaView, ScrollView, Text, View } from "react-native";
import { useBriefData } from "@/features/brief/useBriefData";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";
import { Tag } from "@/ui/Tag";

export default function BriefScreen() {
  const { userId } = useAuth();
  const { brief } = useBriefData(userId);

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}>
        <View className="pt-3 pb-2">
          <Link href="/people" className="text-[12px] text-accent font-bodyMedium">
            Open people →
          </Link>
          <Text className="text-[12px] text-text3 font-body">Thursday, 28 May</Text>
          <Text className="text-[30px] leading-[36px] text-text1 font-heading mt-1">
            Good morning,{"\n"}
            <Text className="text-accent">{brief.firstName}.</Text>
          </Text>
        </View>

        <SectionLabel>Weather</SectionLabel>
        <BriefCard stripeColor="blue">
          <Text className="text-[28px] text-text1 font-heading">{brief.weather.temp}</Text>
          <Text className="text-[13px] text-text2 font-body mt-1">{brief.weather.description}</Text>
        </BriefCard>

        <SectionLabel>Today&apos;s schedule</SectionLabel>
        <BriefCard stripeColor="blue">
          {brief.schedule.map((item) => (
            <View key={item.title} className="mb-3 last:mb-0">
              <Text className="text-[12px] text-text3 font-bodyMedium">{item.time}</Text>
              <Text className="text-[15px] text-text1 font-bodyMedium mt-1">{item.title}</Text>
              <Text className="text-[12px] text-text3 font-body mt-1">{item.note}</Text>
            </View>
          ))}
        </BriefCard>

        <SectionLabel>Red-letter days</SectionLabel>
        <BriefCard stripeColor="amber">
          {brief.redLetterDays.map((item) => (
            <View key={item.id} className="mb-3 last:mb-0">
              <Text className="text-[15px] text-text1 font-bodyMedium">{item.personName}</Text>
              <Tag tone="amber" className="mt-1">
                {item.headline}
              </Tag>
              <Text className="text-[12px] text-text3 font-body mt-1">{item.timing}</Text>
            </View>
          ))}
        </BriefCard>
      </ScrollView>
    </SafeAreaView>
  );
}
