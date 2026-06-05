import { eventIcon, iconAndTitle } from "@/lib/brief/eventIcon";

describe("eventIcon", () => {
  it("returns clock for empty title", () => {
    expect(eventIcon(null)).toBe("🕐");
    expect(eventIcon(undefined)).toBe("🕐");
    expect(eventIcon("")).toBe("🕐");
  });

  it("maps known keywords", () => {
    expect(eventIcon("Tannlege")).toBe("🦷");
    expect(eventIcon("Løpetur")).toBe("🏃");
    expect(eventIcon("Coffee with Anna")).toBe("☕");
  });

  it("falls back to clock for unknown titles", () => {
    expect(eventIcon("Styremøte")).toBe("🕐");
  });
});

describe("iconAndTitle", () => {
  it("uses trailing emoji as icon and strips it from title", () => {
    expect(iconAndTitle("Helgebesøk Ivan 🏡")).toEqual({
      icon: "🏡",
      title: "Helgebesøk Ivan",
    });
  });

  it("falls back to keyword icon when no trailing emoji", () => {
    expect(iconAndTitle("Middag hos Ida")).toEqual({
      icon: "🍽️",
      title: "Middag hos Ida",
    });
  });

  it("ignores trailing emoji when title would become empty", () => {
    expect(iconAndTitle("🎉")).toEqual({ icon: "🕐", title: "🎉" });
  });
});
