import { describe, expect, it } from "vitest";
import { createCaptureSession } from "../src/domain/sessionFactory";

describe("createCaptureSession", () => {
  it("creates canonical session with evaluated tolerances", () => {
    const s = createCaptureSession({
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
        heightRight: 1199,
      },
      toleranceConfig: { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4 },
    });

    expect(s.sessionId).toMatch(/^session_/);
    expect(s.overallStatus).toBe("PASS");
    expect(s.toleranceResults.length).toBeGreaterThan(0);
    expect(s.syncState).toBe("local_only");
  });
});

