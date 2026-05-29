import * as Haptics from "expo-haptics";

/**
 * Lightweight haptic feedback for icon taps, selections, and UI events.
 * Call before navigation or state changes for a physical, responsive feel.
 */
export function triggerLight() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/**
 * Medium haptic for confirmation actions, delete, submit.
 */
export function triggerMedium() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

/**
 * Heavy haptic for critical actions (delete person, clear all).
 */
export function triggerHeavy() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

/**
 * Selection changed — smooth, subtle click.
 */
export function triggerSelection() {
  void Haptics.selectionAsync();
}

/**
 * Success notification.
 */
export function triggerSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

/**
 * Error/warning notification.
 */
export function triggerError() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
}
