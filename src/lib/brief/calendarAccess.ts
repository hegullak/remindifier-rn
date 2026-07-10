import Constants from "expo-constants";

/** True when running inside the Expo Go host app (not a custom dev/production build). */
export function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/** expo-calendar cannot read device calendars in Expo Go — requires a dev build with native config. */
export function calendarRequiresDevBuild(): boolean {
  return isExpoGo();
}
