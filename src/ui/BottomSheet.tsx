import { useCallback, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, type StyleProp, Text, View, type ViewStyle } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";

export interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  title?: string;
  /** large = takes ~55% of screen height with scroll */
  large?: boolean;
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
  large,
  contentStyle,
}: {
  title?: string;
  children: React.ReactNode;
  onDismiss: () => void;
  large?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const screenH = Dimensions.get("window").height;
  const sheetH = large ? Math.round(screenH * 0.55) : undefined;

  return (
    <View
      className="bg-card rounded-t-hero px-5 pt-4 pb-8"
      style={[contentStyle, sheetH ? { minHeight: sheetH, maxHeight: sheetH } : undefined]}
    >
      <View className="w-10 h-1 rounded-pill bg-border self-center mb-4" />
      {title ? (
        <Text className="text-lg text-text1 font-heading mb-3">{title}</Text>
      ) : null}
      {large ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
      <Pressable onPress={onDismiss} className="absolute top-3 right-4 p-2" hitSlop={8}>
        <Text className="text-xl text-text3 font-body">✕</Text>
      </Pressable>
    </View>
  );
}

/**
 * Modal-based bottom sheet. Works in Expo Go (unlike @expo/ui SwiftUI BottomSheet).
 * Use large={true} for brief summary sheets that need more vertical space.
 */
export function BottomSheet({ visible, onDismiss, children, title, large }: BottomSheetProps) {
  const { themeClass, themeVarsStyle } = useAppTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      {/* Re-apply theme class: Modal renders in a separate portal outside the
          ThemeProvider tree, so NativeWind color vars (text-text1, bg-card…)
          would otherwise fall back to light theme. */}
      <View className={`${themeClass} flex-1`.trim()} style={themeVarsStyle}>
        <Pressable className="flex-1 bg-black/40 justify-end" onPress={onDismiss}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <SheetChrome title={title} onDismiss={onDismiss} large={large}>
              {children}
            </SheetChrome>
          </Pressable>
        </Pressable>
      </View>
    </Modal>
  );
}
