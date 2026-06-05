import { themeClassFor } from "@/theme/themeClass";

describe("themeClassFor", () => {
  it("maps sand to no class", () => {
    expect(themeClassFor("sand")).toBe("");
  });

  it("maps slate to dark", () => {
    expect(themeClassFor("slate")).toBe("dark");
  });

  it("maps guitar to dark (colors via vars())", () => {
    expect(themeClassFor("guitar")).toBe("dark");
  });
});
