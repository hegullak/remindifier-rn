import { Text, View } from "react-native";
import type { DayLoad } from "@/lib/brief/dayLoad";
import type { BriefStripeColor } from "@/theme/tokens";
import { BriefCard } from "@/ui/BriefCard";

const LOAD_STRIPE: Record<DayLoad, BriefStripeColor> = {
  light: "sage",
  moderate: "amber",
  busy: "red",
};

const LOAD_BADGE: Record<DayLoad, { dot: string; text: string }> = {
  light: { dot: "bg-sage", text: "text-sage" },
  moderate: { dot: "bg-amber", text: "text-amber" },
  busy: { dot: "bg-red", text: "text-red" },
};

export function DayLoadCard({
  load,
  label,
  reason,
}: {
  load: DayLoad;
  label: string;
  reason: string;
}) {
  const badge = LOAD_BADGE[load];
  return (
    <BriefCard stripeColor={LOAD_STRIPE[load]}>
      <View className="flex-row items-center gap-2 mb-1">
        <View className={`w-2 h-2 rounded-full ${badge.dot}`} />
        <Text className={`text-body-lg font-bodySemi ${badge.text}`}>{label}</Text>
      </View>
      <Text className="text-body text-text2 font-body leading-[19px]">{reason}</Text>
    </BriefCard>
  );
}
