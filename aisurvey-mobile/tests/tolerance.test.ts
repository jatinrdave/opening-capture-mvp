import { describe, expect, it } from "vitest";
import { evaluateTolerances } from "../src/domain/tolerance";

describe("tolerance evaluation", () => {
  it("flags width range failures", () => {
    const r = evaluateTolerances(
      {
        widthTop: 1000,
        widthMid: 1006,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1200,
      },
      { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4 }
    );
    expect(r.overall).toBe("FAIL");
    expect(r.results.find((x) => x.check === "widthRange")?.status).toBe("FAIL");
  });

  it("passes when within limits", () => {
    const r = evaluateTolerances(
      {
        widthTop: 1000,
        widthMid: 1001,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1199,
      },
      { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4 }
    );
    expect(r.overall).toBe("PASS");
  });
});

