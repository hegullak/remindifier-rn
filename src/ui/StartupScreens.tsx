import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "@/i18n/LanguageContext";
import { EchoflowMark } from "@/ui/EchoflowMark";

export function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={loadingStyles.container}>
      <EchoflowMark size={72} color="#7EB8D4" />
      <ActivityIndicator size="small" color="#7EB8D4" style={{ marginTop: 24 }} />
      <Text style={loadingStyles.message}>{message}</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1E26",
    paddingHorizontal: 24,
    gap: 12,
  },
  message: {
    fontSize: 15,
    color: "#8E97AD",
    textAlign: "center",
    marginTop: 12,
  },
});

export function FatalScreen({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={fatalStyles.container} edges={["top", "bottom"]}>
      <View style={fatalStyles.body}>
        <Text style={fatalStyles.title}>{t("startup.startupError")}</Text>
        <Text style={fatalStyles.message}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const fatalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1E26",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  title: {
    fontSize: 22,
    color: "#EEF0F5",
    fontWeight: "600",
  },
  message: {
    fontSize: 14,
    color: "#E57373",
    marginTop: 12,
    lineHeight: 20,
  },
});
