import { describe, expect, it } from "vitest";
import { evaluateTolerances } from "../src/domain/tolerance";

const cfg = { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4, warnBandMultiplier: 2 };

describe("tolerance evaluation", () => {
  it("flags width range failures beyond warn ceiling", () => {
    const r = evaluateTolerances(
      {
        widthTop: 1000,
        widthMid: 1010,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1200,
      },
      cfg
    );
    expect(r.overall).toBe("FAIL");
    expect(r.results.find((x) => x.check === "widthRange")?.status).toBe("FAIL");
  });

  it("warns when between PASS limit and PASS × multiplier", () => {
    const r = evaluateTolerances(
      {
        widthTop: 1000,
        widthMid: 1006,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1200,
      },
      cfg
    );
    expect(r.overall).toBe("WARN");
    expect(r.results.find((x) => x.check === "widthRange")?.status).toBe("WARN");
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
      cfg
    );
    expect(r.overall).toBe("PASS");
  });
});

