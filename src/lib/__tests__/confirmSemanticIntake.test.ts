import * as Crypto from "expo-crypto";
import { createGathering } from "@/db/repos/gatheringsRepo";
import { createPersonEntry, listPeopleSummaries } from "@/db/repos/peopleRepo";
import { confirmSemanticIntake } from "@/lib/intake/confirmSemanticIntake";
import type { SemanticIntakeParseResult } from "@/lib/intake/semanticIntakeParser.types";

jest.mock("@/db/repos/gatheringsRepo");
jest.mock("@/db/repos/peopleRepo");
jest.mock("@/lib/logger", () => ({ logger: { info: jest.fn() } }));

const baseParsed = (): SemanticIntakeParseResult => ({
  rawText: "input",
  fields: [],
  ambiguities: [],
  overallConfidence: "high",
  person: null,
  event: null,
  scheduledAt: null,
  followUps: [],
  freeFormNote: null,
});

describe("confirmSemanticIntake", () => {
  beforeEach(() => {
    jest.spyOn(Crypto, "randomUUID").mockReturnValue("tp-1");
    (listPeopleSummaries as jest.Mock).mockResolvedValue([
      { id: "p1", displayName: "Ola Nordmann" },
    ]);
    (createGathering as jest.Mock).mockResolvedValue("g-new");
    (createPersonEntry as jest.Mock).mockResolvedValue("e-new");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates gathering when event title is present", async () => {
    const parsed = {
      ...baseParsed(),
      event: { title: "Middag", confidence: "high" as const },
      person: { name: "Ola Nordmann", confidence: "high" as const },
      followUps: [{ text: "Spør om hunden", confidence: "high" as const }],
    };

    const result = await confirmSemanticIntake("user-1", parsed);
    expect(result).toEqual({ kind: "gathering", gatheringId: "g-new" });
    expect(createGathering).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        title: "Middag",
        personIds: ["p1"],
      }),
    );
  });

  it("creates follow-up when person matches and no event", async () => {
    const parsed = {
      ...baseParsed(),
      person: { name: "ola nordmann", confidence: "high" as const },
      followUps: [{ text: "Husk blomster", confidence: "high" as const }],
    };

    const result = await confirmSemanticIntake("user-1", parsed);
    expect(result).toEqual({
      kind: "follow_up",
      entryId: "e-new",
      personId: "p1",
    });
  });

  it("throws when nothing can be confirmed", async () => {
    await expect(confirmSemanticIntake("user-1", baseParsed())).rejects.toThrow(
      "semantic_intake_nothing_to_confirm",
    );
  });
});
