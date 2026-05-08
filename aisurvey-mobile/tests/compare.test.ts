import { describe, expect, it } from "vitest";
import { diffMeasurements } from "../src/domain/compare";

describe("diffMeasurements", () => {
  it("computes deltas", () => {
    const d = diffMeasurements(
      { widthTop: 1000, widthMid: 1000, widthBottom: 1000, heightLeft: 1200, heightCenter: 1200, heightRight: 1200 },
      { widthTop: 1002, widthMid: 1000, widthBottom: 999, heightLeft: 1200, heightCenter: 1198, heightRight: 1200 }
    );
    expect(d.widthTopDelta).toBe(2);
    expect(d.heightCenterDelta).toBe(-2);
  });
});
