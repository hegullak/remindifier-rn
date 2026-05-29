import * as Haptics from "expo-haptics";

/**
 * Lightweight haptic feedback for icon taps, selections, and UI events.
 * Call before navigation or state changes for a physical, responsive feel.
 */
export function triggerLight() {
  console.log("[HAPTICS] triggerLight called");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch((err) => {
    console.warn("[HAPTICS] Light failed:", err);
  });
}

/**
 * Medium haptic for confirmation actions, delete, submit.
 */
export function triggerMedium() {
  console.log("[HAPTICS] triggerMedium called");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch((err) => {
    console.warn("[HAPTICS] Medium failed:", err);
  });
}

/**
 * Heavy haptic for critical actions (delete person, clear all).
 */
export function triggerHeavy() {
  console.log("[HAPTICS] triggerHeavy called");
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch((err) => {
    console.warn("[HAPTICS] Heavy failed:", err);
  });
}

/**
 * Selection changed — smooth, subtle click.
 */
export function triggerSelection() {
  console.log("[HAPTICS] triggerSelection called");
  Haptics.selectionAsync().catch((err) => {
    console.warn("[HAPTICS] Selection failed:", err);
  });
}

/**
 * Success notification.
 */
export function triggerSuccess() {
  console.log("[HAPTICS] triggerSuccess called");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((err) => {
    console.warn("[HAPTICS] Success failed:", err);
  });
}

/**
 * Error/warning notification.
 */
export function triggerError() {
  console.log("[HAPTICS] triggerError called");
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch((err) => {
    console.warn("[HAPTICS] Error failed:", err);
  });
}
