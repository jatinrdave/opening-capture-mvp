import { describe, expect, it } from "vitest";
import { parseCaptureSessionDraft } from "../src/domain/validation";

describe("capture session validation", () => {
  it("rejects missing required photos", () => {
    const result = parseCaptureSessionDraft({
      openingId: "opening_123",
      requiredPhotos: {
        overview: null,
        leftJamb: null,
        rightJamb: null,
        head: null,
        sill: null,
      },
      measurements: {
        widthTop: 1000,
        widthMid: 1000,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1200,
      },
      toleranceConfig: {
        maxOutOfSquareMm: 5,
        maxWidthRangeMm: 4,
        maxHeightRangeMm: 4,
        warnBandMultiplier: 1.5,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issuePaths = result.error.issues.map((i) => i.path.join("."));
      expect(issuePaths).toEqual(expect.arrayContaining(["requiredPhotos.overview"]));
      expect(issuePaths).toEqual(
        expect.arrayContaining([
          "requiredPhotos.leftJamb",
          "requiredPhotos.rightJamb",
          "requiredPhotos.head",
          "requiredPhotos.sill",
        ])
      );
    }
  });

  it("accepts when required photos and required measurements exist", () => {
    const result = parseCaptureSessionDraft({
      openingId: "opening_123",
      requiredPhotos: {
        overview: "file:///x/overview.jpg",
        leftJamb: "file:///x/left.jpg",
        rightJamb: "file:///x/right.jpg",
        head: "file:///x/head.jpg",
        sill: "file:///x/sill.jpg",
      },
      measurements: {
        widthTop: 1000,
        widthMid: 1001,
        widthBottom: 1000,
        heightLeft: 1200,
        heightCenter: 1200,
        heightRight: 1198,
      },
      toleranceConfig: {
        maxOutOfSquareMm: 5,
        maxWidthRangeMm: 4,
        maxHeightRangeMm: 4,
        warnBandMultiplier: 1.5,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingId).toBe("opening_123");
    }
  });
});
