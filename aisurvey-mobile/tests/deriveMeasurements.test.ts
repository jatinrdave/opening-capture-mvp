import { describe, expect, it } from "vitest";
import { computeDerivedMeasurements } from "../src/domain/deriveMeasurements";

describe("computeDerivedMeasurements", () => {
  it("uses mid width and center height as nominals", () => {
    const d = computeDerivedMeasurements({
      widthTop: 1000,
      widthMid: 1002,
      widthBottom: 998,
      heightLeft: 2100,
      heightCenter: 2099,
      heightRight: 2101,
    });
    expect(d.nominalWidthMm).toBe(1002);
    expect(d.nominalHeightMm).toBe(2099);
    expect(d.widthMinMm).toBe(998);
    expect(d.widthMaxMm).toBe(1002);
    expect(d.heightMinMm).toBe(2099);
    expect(d.heightMaxMm).toBe(2101);
    expect(d.outOfSquareWidthMm).toBe(2);
    expect(d.outOfSquareHeightMm).toBe(1);
  });
});
