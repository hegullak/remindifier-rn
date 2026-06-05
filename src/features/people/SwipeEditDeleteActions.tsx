import { Pressable, Text, View } from "react-native";
import { triggerLight, triggerSelection } from "@/lib/haptics";

/** Swipe action icon sizes — edit is larger for legibility at a glance. */
export const SWIPE_EDIT_ICON = { color: "#fff", fontSize: 26, lineHeight: 28 } as const;
const SWIPE_DELETE_ICON = { color: "#fff", fontSize: 20, lineHeight: 24 } as const;

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
        <Text style={SWIPE_EDIT_ICON}>✎</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          triggerLight();
          onDelete();
        }}
        className="bg-red items-center justify-center px-5"
      >
        <Text style={SWIPE_DELETE_ICON}>🗑</Text>
      </Pressable>
    </View>
  );
}
