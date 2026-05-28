import { useCallback, useState } from "react";
import { Modal, Pressable, type StyleProp, Text, View, type ViewStyle } from "react-native";

export interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  title?: string;
}

export function useBottomSheet(initialVisible = false) {
  const [visible, setVisible] = useState(initialVisible);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  return { visible, show, hide, setVisible };
}

function SheetChrome({
  title,
  children,
  onDismiss,
  contentStyle,
}: {
  title?: string;
  children: React.ReactNode;
  onDismiss: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View className="bg-card rounded-t-hero px-5 pt-4 pb-8" style={contentStyle}>
      <View className="w-10 h-1 rounded-pill bg-border self-center mb-4" />
      {title ? <Text className="text-[18px] text-text1 font-heading mb-2">{title}</Text> : null}
      {children}
      <Pressable onPress={onDismiss} className="absolute top-3 right-4 p-2" hitSlop={8}>
        <Text className="text-[20px] text-text3 font-body">✕</Text>
      </Pressable>
    </View>
  );
}

/**
 * Modal-based bottom sheet. Works in Expo Go (unlike @expo/ui SwiftUI BottomSheet).
 */
export function BottomSheet({ visible, onDismiss, children, title }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Pressable className="flex-1 bg-black/40 justify-end" onPress={onDismiss}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SheetChrome title={title} onDismiss={onDismiss}>
            {children}
          </SheetChrome>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
