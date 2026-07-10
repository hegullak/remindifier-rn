import { Text } from "react-native";
import type { BriefStripeColor } from "@/theme/tokens";
import { BriefCard } from "@/ui/BriefCard";
import { SectionLabel } from "@/ui/SectionLabel";

/** A calm section: uppercase label + one interpreted paragraph. */
export function BriefTextCard({
  label,
  text,
  stripeColor,
}: {
  label: string;
  text: string;
  stripeColor: BriefStripeColor;
}) {
  return (
    <>
      <SectionLabel>{label}</SectionLabel>
      <BriefCard stripeColor={stripeColor}>
        <Text className="text-body-lg text-text1 font-body leading-[22px]">{text}</Text>
      </BriefCard>
    </>
  );
}
