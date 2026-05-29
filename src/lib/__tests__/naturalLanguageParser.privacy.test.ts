import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  hasSeenNaturalLanguagePrivacy,
  markNaturalLanguagePrivacySeen,
} from "@/lib/people/naturalLanguageParser.privacy";

describe("naturalLanguageParser.privacy", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("tracks privacy notice dismissal", async () => {
    expect(await hasSeenNaturalLanguagePrivacy()).toBe(false);
    await markNaturalLanguagePrivacySeen();
    expect(await hasSeenNaturalLanguagePrivacy()).toBe(true);
  });
});
