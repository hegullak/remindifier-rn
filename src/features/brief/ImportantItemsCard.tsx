import { Text, View } from "react-native";
import type { ImportantItem } from "@/lib/brief/interpretDay";
import type { BriefStripeColor } from "@/theme/tokens";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";

/** Special appointments — today ("Viktig i dag") or later this week. */
export function ImportantItemsCard({
  label,
  items,
  stripeColor,
  showDayLabel = false,
}: {
  label: string;
  items: ImportantItem[];
  stripeColor: BriefStripeColor;
  showDayLabel?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <BriefCard stripeColor={stripeColor}>
        {items.map((item, i) => (
          <View key={item.id} className={i < items.length - 1 ? "mb-3" : ""}>
            <View className="flex-row items-start gap-2">
              <Text className="text-base mt-0.5">{item.icon}</Text>
              <View className="flex-1">
                <Text className="text-body-lg text-text1 font-bodyMedium">
                  {[showDayLabel ? item.dayLabel : item.time, item.title]
                    .filter(Boolean)
                    .join(showDayLabel ? " · " : " ")}
                </Text>
                {item.hint ? (
                  <Text className="text-body text-text2 font-body mt-0.5 leading-[18px]">
                    {item.hint}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        ))}
      </BriefCard>
    </>
  );
}
