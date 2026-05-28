import { Stack } from "expo-router";

export default function PeopleStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "var(--bg)" },
      }}
    />
  );
}
