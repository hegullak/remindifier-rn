/**
 * Integration: semantic intake parse → confirm (repos mocked).
 */
import { confirmSemanticIntake } from "@/lib/intake/confirmSemanticIntake";
import { parseSemanticIntakeLocal } from "@/lib/intake/semanticIntakeParser";
import { createGathering } from "@/db/repos/gatheringsRepo";
import { listPeopleSummaries } from "@/db/repos/peopleRepo";

jest.mock("@/db/repos/gatheringsRepo");
jest.mock("@/db/repos/peopleRepo");
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn() } }));

const WEDNESDAY = new Date("2026-05-27T12:00:00");

describe("semantic intake flow", () => {
  beforeEach(() => {
    (listPeopleSummaries as jest.Mock).mockResolvedValue([
      { id: "p-ida", displayName: "Ida" },
    ]);
    (createGathering as jest.Mock).mockResolvedValue("g-created");
  });

  it("parses Norwegian dinner note and confirms as gathering", async () => {
    const parsed = parseSemanticIntakeLocal(
      "Middag hos Ida fredag kl 19, ta med blomster og spør om jobben",
      { referenceDate: WEDNESDAY, locale: "no" },
    );

    expect(parsed.event?.title).toMatch(/Middag/i);
    expect(parsed.person?.name).toBe("Ida");
    expect(parsed.followUps.length).toBeGreaterThan(0);

    const confirmed = await confirmSemanticIntake("user-1", parsed);
    expect(confirmed).toEqual({ kind: "gathering", gatheringId: "g-created" });
    expect(createGathering).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        personIds: ["p-ida"],
        title: expect.stringMatching(/Middag/i),
      }),
    );
  });
});
