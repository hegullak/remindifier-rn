import { Text, View } from "react-native";
import { useTranslation } from "@/i18n";
import { useAppTheme } from "@/theme/ThemeProvider";
import { TAB_BAR_UI } from "@/theme/tokens";
import { EchoflowMark } from "@/ui/EchoflowMark";

export function AppBrand() {
  const { t } = useTranslation();
  const { theme } = useAppTheme();
  const accent = TAB_BAR_UI[theme].accent;

  return (
    <View className="flex-row items-center gap-2" accessibilityRole="header">
      <EchoflowMark size={26} color={accent} />
      <Text className="text-text1 font-bodySemi" style={{ fontSize: 15.6, letterSpacing: 0.2 }}>
        {t("common.appName")}
      </Text>
    </View>
  );
}
