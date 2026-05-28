import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";

export function LoadingScreen({ message }: { message: string }) {
  return (
    <View style={loadingStyles.container}>
      <ActivityIndicator size="large" color="#C4784A" />
      <Text style={loadingStyles.title}>remindifier</Text>
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
  title: {
    fontSize: 28,
    color: "#EEF0F5",
    marginTop: 8,
  },
  message: {
    fontSize: 15,
    color: "#8E97AD",
    textAlign: "center",
  },
});

export function FatalScreen({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 bg-bg">
      <View className="flex-1 px-6 pt-20">
        <Text className="text-[22px] leading-[28px] text-text1 font-heading">Startup error</Text>
        <Text className="text-[14px] text-red font-body mt-3">{message}</Text>
      </View>
    </SafeAreaView>
  );
}
