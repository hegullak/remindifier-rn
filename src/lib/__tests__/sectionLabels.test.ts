import { briefSectionLabelKey } from "@/lib/brief/sectionLabels";

describe("briefSectionLabelKey", () => {
  it("maps red_letter to brief.sections.redLetter", () => {
    expect(briefSectionLabelKey("red_letter")).toBe("brief.sections.redLetter");
  });

  it("maps other section ids to brief.sections.<id>", () => {
    expect(briefSectionLabelKey("calendar")).toBe("brief.sections.calendar");
    expect(briefSectionLabelKey("training")).toBe("brief.sections.training");
  });

});
