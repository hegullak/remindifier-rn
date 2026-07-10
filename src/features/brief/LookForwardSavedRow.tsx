import { Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { SwipeEditDeleteActions } from "@/features/people/SwipeEditDeleteActions";

type LookForwardSavedRowProps = {
  text: string;
  onEdit: () => void;
  onDelete: () => void;
};

export function LookForwardSavedRow({ text, onEdit, onDelete }: LookForwardSavedRowProps) {
  return (
    <View style={{ marginBottom: 12, borderRadius: 14, overflow: "hidden" }}>
      <Swipeable
        friction={1.5}
        overshootRight={false}
        rightThreshold={40}
        renderRightActions={() => <SwipeEditDeleteActions onEdit={onEdit} onDelete={onDelete} />}
      >
        <View className="flex-row items-start gap-2 py-0.5">
          <Text className="text-base mt-0.5">✨</Text>
          <View className="flex-1">
            <Text className="text-body-lg text-text1 font-bodyMedium">{text}</Text>
          </View>
        </View>
      </Swipeable>
    </View>
  );
}
