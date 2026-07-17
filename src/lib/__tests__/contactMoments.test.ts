import type { CalendarBriefEvent } from "@/lib/brief/calendarEvents";
import {
  type AfterNoteThread,
  buildContactMomentLine,
  extractContactName,
  findContactMoment,
  gatherPointsForName,
} from "@/lib/brief/contactMoments";
import type { OpenIntention } from "@/lib/brief/intentionWeave";

function makeEvent(id: string, hour: number, title: string): CalendarBriefEvent {
  const startDate = new Date(2026, 5, 1, hour, 0, 0, 0);
  return {
    id,
    title,
    startDate,
    endDate: new Date(startDate.getTime() + 60 * 60000),
    allDay: false,
    daysUntil: 0,
    isToday: true,
  };
}

const IVAN_THREADS: AfterNoteThread[] = [
  { text: "ringe Ivan", afterNote: "Svigerfaren døde forrige uke\nHar fått ny jobb" },
];

describe("extractContactName", () => {
  it("extracts the name after med/hos", () => {
    expect(extractContactName("Kveld med Ivan")).toBe("Ivan");
    expect(extractContactName("Middag hos Ida")).toBe("Ida");
  });

  it("captures multi-word capitalized names", () => {
    expect(extractContactName("Lunsj med Ida Berg")).toBe("Ida Berg");
  });

  it("returns null when no contact preposition + name exists", () => {
    expect(extractContactName("Standup")).toBeNull();
    expect(extractContactName("Fotballtrening")).toBeNull();
    expect(extractContactName("Møte med teamet")).toBeNull();
  });
});

describe("gatherPointsForName", () => {
  it("collects after-note lines from threads mentioning the name", () => {
    expect(gatherPointsForName("Ivan", [], IVAN_THREADS)).toEqual([
      "Svigerfaren døde forrige uke",
      "Har fått ny jobb",
    ]);
  });

  it("puts open-intention talking points first", () => {
    const open: OpenIntention[] = [
      { id: "i1", text: "spørre Ivan om stillaset", dueBy: "2026-06-07", notes: "Låne stillaset?" },
    ];
    expect(gatherPointsForName("Ivan", open, IVAN_THREADS)).toEqual([
      "Låne stillaset?",
      "Svigerfaren døde forrige uke",
      "Har fått ny jobb",
    ]);
  });

  it("caps at three points and dedupes", () => {
    const threads: AfterNoteThread[] = [
      { text: "ringe Ivan", afterNote: "A\nB\nC\nD" },
      { text: "besøke Ivan", afterNote: "a" },
    ];
    expect(gatherPointsForName("Ivan", [], threads)).toEqual(["A", "B", "C"]);
  });

  it("returns empty for an unknown name", () => {
    expect(gatherPointsForName("Kari", [], IVAN_THREADS)).toEqual([]);
  });
});

describe("findContactMoment", () => {
  it("finds the first event whose named person the threads know", () => {
    const events = [makeEvent("a", 9, "Standup"), makeEvent("b", 19, "Kveld med Ivan")];
    const moment = findContactMoment(events, [], IVAN_THREADS);
    expect(moment).toEqual({
      eventTitle: "Kveld med Ivan",
      name: "Ivan",
      points: ["Svigerfaren døde forrige uke", "Har fått ny jobb"],
    });
  });

  it("skips named events the threads know nothing about", () => {
    const events = [makeEvent("a", 12, "Lunsj med Kari")];
    expect(findContactMoment(events, [], IVAN_THREADS)).toBeNull();
  });

  it("returns null when no event names anyone", () => {
    const events = [makeEvent("a", 9, "Standup")];
    expect(findContactMoment(events, [], IVAN_THREADS)).toBeNull();
  });
});

describe("buildContactMomentLine", () => {
  const moment = {
    eventTitle: "Kveld med Ivan",
    name: "Ivan",
    points: ["den nye jobben", "svigerfaren"],
  };

  it("builds the Norwegian prep line for tomorrow", () => {
    expect(buildContactMomentLine(moment, "no", "tomorrow")).toBe(
      "Før «Kveld med Ivan» i morgen — verdt å huske: den nye jobben · svigerfaren.",
    );
  });

  it("builds the English prep line for today", () => {
    expect(buildContactMomentLine(moment, "en", "today")).toBe(
      'Before "Kveld med Ivan" today — worth remembering: den nye jobben · svigerfaren.',
    );
  });
});
