import { Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import { formatBriefHeaderDate } from "@/lib/brief/calendarWeek";

export function BriefDateHeader() {
  const { t, locale } = useTranslation();
  const { dateLine, week } = formatBriefHeaderDate(locale);

  return (
    <View className="flex-row flex-wrap items-baseline gap-x-1.5 mb-4">
      <Text className="text-3xs text-text1 font-bodySemi leading-[15px]">{dateLine}</Text>
      <Text className="text-3xs text-text3 font-bodySemi leading-[15px]">·</Text>
      <Text className="text-3xs uppercase tracking-[1.2px] text-text1 font-bodySemi leading-[14px]">
        {t("brief.dateWeek", { week }).toUpperCase()}
      </Text>
    </View>
  );
}
