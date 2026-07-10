import { calendarRequiresDevBuild, isExpoGo } from "@/lib/brief/calendarAccess";

jest.mock("expo-constants", () => ({
  appOwnership: "expo",
}));

describe("calendarAccess", () => {
  it("detects Expo Go host", () => {
    expect(isExpoGo()).toBe(true);
    expect(calendarRequiresDevBuild()).toBe(true);
  });
});
