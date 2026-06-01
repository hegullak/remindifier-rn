import { Pressable, Text, View } from "react-native";
import { triggerLight, triggerSelection } from "@/lib/haptics";

type Props = {
  onEdit: () => void;
  onDelete: () => void;
};

export function SwipeEditDeleteActions({ onEdit, onDelete }: Props) {
  return (
    <View className="flex-row">
      <Pressable
        onPress={() => {
          triggerSelection();
          onEdit();
        }}
        className="bg-amber items-center justify-center px-5"
      >
        <Text className="text-xl" style={{ color: "#fff" }}>
          ✎
        </Text>
      </Pressable>
      <Pressable
        onPress={() => {
          triggerLight();
          onDelete();
        }}
        className="bg-red items-center justify-center px-5"
      >
        <Text className="text-xl" style={{ color: "#fff" }}>
          🗑
        </Text>
      </Pressable>
    </View>
  );
}
