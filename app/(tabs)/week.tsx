import { ScrollView, Text, View } from "react-native";
import { AppShell } from "@/ui/AppShell";

export default function WeekScreen() {
  return (
    <AppShell>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 130 }}
      >
        <Text className="text-3xl text-text1 font-heading mb-4">Week</Text>
        <View className="bg-surface-2 rounded-lg p-4">
          <Text className="text-body text-text2 font-body">Week view coming soon</Text>
        </View>
      </ScrollView>
    </AppShell>
  );
}
