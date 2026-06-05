/**
 * Integration: demo schedule → gathering links → morning brief copy.
 */
import { localizeScheduleItem } from "@/features/brief/briefContent";
import { buildMorningBrief } from "@/lib/brief/morningBrief";
import { iconAndTitle } from "@/lib/brief/eventIcon";
import { enrichScheduleWithGatheringIds } from "@/lib/gatherings/briefLinks";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";

const MONDAY = new Date(2026, 5, 1, 8, 0, 0, 0);

describe("brief morning pipeline", () => {
  it("localizes demo schedule, links gathering, and feeds morning brief", () => {
    const scheduleRaw = [
      { id: "s1", time: "19:00", title: "Dinner at Ida's", note: "Bring flowers" },
    ];
    const gatherings = [{ id: "g-1", title: "Dinner at Ida's" }];

    const localized = scheduleRaw.map((item) => localizeScheduleItem(item, "no"));
    expect(localized[0].title).toBe("Middag hos Ida");

    const enriched = enrichScheduleWithGatheringIds(localized, gatherings, "no");
    expect(enriched[0].gatheringId).toBe("g-1");
    expect(localizeGatheringTitle("g-1", "Dinner at Ida's", "no")).toBe("Middag hos Ida");

    const { icon, title } = iconAndTitle(enriched[0].title);
    expect(icon).toBe("🍽️");
    expect(title).toBe("Middag hos Ida");

    const todayEvents = [
      {
        id: "cal-1",
        title: enriched[0].title,
        startDate: new Date(2026, 5, 1, 19, 0, 0, 0),
        allDay: false,
        daysUntil: 0,
        isToday: true,
        calendarName: "Privat",
      },
    ];

    const brief = buildMorningBrief(todayEvents, [], "no", MONDAY);
    expect(brief.isEmpty).toBe(false);
    expect(brief.body).toMatch(/19:00|kl\. 19/);
    expect(brief.pillText).toMatch(/møte|1 møte/i);
  });
});
