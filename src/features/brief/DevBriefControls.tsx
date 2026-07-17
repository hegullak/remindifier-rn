import { Pressable, ScrollView, Text } from "react-native";

/** Dev-only Brief testing controls — rendered in the header, never in production. */
export function DevBriefControls({
  mockMode,
  onToggleMock,
  periodOverride,
  onSetPeriod,
  onSeedIntention,
  onClearIntentions,
}: {
  mockMode: boolean;
  onToggleMock: () => void;
  periodOverride: "morning" | "evening" | null;
  onSetPeriod: (period: "morning" | "evening" | null) => void;
  onSeedIntention: () => void;
  onClearIntentions: () => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 4, alignItems: "center" }}
    >
      <Pressable
        onPress={onToggleMock}
        className={`px-2 py-1 rounded-pill border ${
          mockMode ? "border-accent bg-accentLight" : "border-border"
        }`}
      >
        <Text
          className={`text-3xs uppercase font-bodySemi ${mockMode ? "text-accent" : "text-text3"}`}
        >
          Mock
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSetPeriod(periodOverride === "morning" ? null : "morning")}
        className={`px-2 py-1 rounded-pill border ${
          periodOverride === "morning" ? "border-accent bg-accentLight" : "border-border"
        }`}
      >
        <Text
          className={`text-3xs uppercase font-bodySemi ${
            periodOverride === "morning" ? "text-accent" : "text-text3"
          }`}
        >
          DM
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSetPeriod(periodOverride === "evening" ? null : "evening")}
        className={`px-2 py-1 rounded-pill border ${
          periodOverride === "evening" ? "border-accent bg-accentLight" : "border-border"
        }`}
      >
        <Text
          className={`text-3xs uppercase font-bodySemi ${
            periodOverride === "evening" ? "text-accent" : "text-text3"
          }`}
        >
          EM
        </Text>
      </Pressable>
      <Pressable
        onPress={onSeedIntention}
        className="px-2 py-1 rounded-pill border border-green/60 bg-greenLight"
      >
        <Text className="text-3xs uppercase font-bodySemi text-green">+Int</Text>
      </Pressable>
      <Pressable
        onPress={onClearIntentions}
        className="px-2 py-1 rounded-pill border border-red/60 bg-redLight"
      >
        <Text className="text-3xs uppercase font-bodySemi text-red">×Int</Text>
      </Pressable>
    </ScrollView>
  );
}
