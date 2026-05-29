import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIVACY_STORAGE_KEY = "natural_language_api_privacy_seen";
const EVENT_PRIVACY_STORAGE_KEY = "natural_language_event_privacy_seen";

export async function hasSeenNaturalLanguagePrivacy(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PRIVACY_STORAGE_KEY);
  return value === "1";
}

export async function markNaturalLanguagePrivacySeen(): Promise<void> {
  await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, "1");
}

export async function hasSeenEventParserPrivacy(): Promise<boolean> {
  const value = await AsyncStorage.getItem(EVENT_PRIVACY_STORAGE_KEY);
  return value === "1";
}

export async function markEventParserPrivacySeen(): Promise<void> {
  await AsyncStorage.setItem(EVENT_PRIVACY_STORAGE_KEY, "1");
}
