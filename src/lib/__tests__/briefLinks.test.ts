import {
  briefGatheringHref,
  enrichScheduleWithGatheringIds,
  gatheringIdForScheduleItem,
} from "@/lib/gatherings/briefLinks";
import { localizeGatheringTitle } from "@/lib/gatherings/localizeGathering";

describe("briefLinks", () => {
  it("maps demo schedule item to gathering", () => {
    expect(gatheringIdForScheduleItem("s1")).toBe("g-1");
  });

  it("enriches schedule with gathering id", () => {
    const gatherings = [{ id: "g-1", title: "Dinner at Ida's" }];
    const result = enrichScheduleWithGatheringIds(
      [{ id: "s1", time: "19:00", title: "Middag hos Ida", note: "" }],
      gatherings,
      "no",
    );
    expect(result[0].gatheringId).toBe("g-1");
  });

  it("localizes demo gathering title in Norwegian", () => {
    expect(localizeGatheringTitle("g-1", "Dinner at Ida's", "no")).toBe("Middag hos Ida");
  });

  it("links unmatched brief rows to new event with prefill", () => {
    expect(briefGatheringHref(null, "Helgebesøk Ivan")).toEqual({
      pathname: "/gather/new",
      params: { prefill: "Helgebesøk Ivan" },
    });
  });
});
