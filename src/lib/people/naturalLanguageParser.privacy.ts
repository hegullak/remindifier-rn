import AsyncStorage from "@react-native-async-storage/async-storage";

const PRIVACY_STORAGE_KEY = "natural_language_api_privacy_seen";

export async function hasSeenNaturalLanguagePrivacy(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PRIVACY_STORAGE_KEY);
  return value === "1";
}

export async function markNaturalLanguagePrivacySeen(): Promise<void> {
  await AsyncStorage.setItem(PRIVACY_STORAGE_KEY, "1");
}
