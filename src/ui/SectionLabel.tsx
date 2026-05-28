import { Text } from "react-native";

export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[11px] uppercase tracking-[2px] text-text3 font-bodySemi mt-5 mb-2">
      {children}
    </Text>
  );
}
