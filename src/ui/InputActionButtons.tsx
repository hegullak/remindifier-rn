import { Pressable, Text, View } from "react-native";
import { triggerLight, triggerMedium } from "@/lib/haptics";

type Props = {
  onConfirm: () => void;
  onDismiss: () => void;
  onDelete?: () => void;
  confirmDisabled?: boolean;
  confirming?: boolean;
};

/** Trash, confirm (✓), and dismiss (✕) — aligned on the right of inline composers. */
export function InputActionButtons({
  onConfirm,
  onDismiss,
  onDelete,
  confirmDisabled = false,
  confirming = false,
}: Props) {
  return (
    <View className="flex-row items-center gap-1">
      {onDelete ? (
        <Pressable
          onPress={() => {
            triggerLight();
            onDelete();
          }}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Delete"
          className="w-10 h-10 items-center justify-center active:opacity-70"
        >
          <Text className="text-lg">🗑</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          if (confirmDisabled || confirming) return;
          triggerMedium();
          onConfirm();
        }}
        disabled={confirmDisabled || confirming}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Confirm"
        className="w-10 h-10 rounded-full bg-accent items-center justify-center active:opacity-70"
      >
        <Text className="text-base text-card font-bodySemi">✓</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          triggerLight();
          onDismiss();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Dismiss"
        className="w-10 h-10 items-center justify-center active:opacity-70"
      >
        <Text className="text-body-lg text-text3 font-body">✕</Text>
      </Pressable>
    </View>
  );
}
