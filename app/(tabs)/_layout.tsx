import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text className={`text-[11px] font-bodySemi ${focused ? "text-accent" : "text-text3"}`}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  const { isDark } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#222838" : "#F7F4EF",
          borderTopColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: isDark ? "#7EB8D4" : "#C4784A",
        tabBarInactiveTintColor: isDark ? "#7A8CAD" : "#A89E90",
      }}
    >
      <Tabs.Screen
        name="brief"
        options={{
          title: "Brief",
          tabBarLabel: ({ focused }) => <TabLabel label="Brief" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarLabel: ({ focused }) => <TabLabel label="People" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
