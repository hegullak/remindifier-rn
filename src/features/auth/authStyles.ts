import { Platform, type TextStyle } from "react-native";

export const authInputClassName =
  "min-h-[56px] rounded-2xl border border-bg2 bg-card px-5 text-lg leading-[24px] text-text1 font-body";
export const authLabelClassName = "text-body-lg text-text2 font-bodyMedium mb-2";
export const authPlaceholderColor = "#A89E90";

/** OTP / e-postkode — bruk `style`, ikke `leading` fra authInputClassName (klipper tall på iOS). */
export const authCodeInputClassName =
  "rounded-2xl border border-bg2 bg-card px-4 text-center text-text1 font-bodySemi";
export const authCodeInputStyle: TextStyle = {
  fontSize: 32,
  lineHeight: 40,
  letterSpacing: 8,
  minHeight: 72,
  paddingVertical: 16,
  paddingHorizontal: 16,
  textAlign: "center",
  ...(Platform.OS === "android" ? { textAlignVertical: "center", includeFontPadding: false } : {}),
};
