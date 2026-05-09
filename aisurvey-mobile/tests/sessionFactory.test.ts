import { describe, expect, it } from "vitest";
import { createCaptureSession } from "../src/domain/sessionFactory";

const baseDraft = {
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
  toleranceConfig: { maxOutOfSquareMm: 10, maxWidthRangeMm: 4, maxHeightRangeMm: 4, warnBandMultiplier: 1.5 },
} as const;

describe("createCaptureSession", () => {
  it("creates canonical session with evaluated tolerances and schema v2 metadata", () => {
    const startedAt = "2026-05-01T10:00:00.000Z";
    const endedAt = "2026-05-01T10:05:00.000Z";
    const s = createCaptureSession({
      draft: baseDraft,
      startedAt,
      endedAt,
      operatorUserId: "jdoe",
      offlineCaptured: true,
      device: { modelName: "TestPhone", appVersion: "1.0.0" },
      location: { status: "unavailable", reason: "tests" },
      projectSnapshot: { projectId: "proj_a", name: "Site A" },
      openingSnapshot: {
        openingId: "opening_123",
        label: "Door 1",
        locationNotes: "Lobby",
        openingType: "single",
      },
    });

    expect(s.sessionId).toMatch(/^session_/);
    expect(s.schemaVersion).toBe(2);
    expect(s.overallStatus).toBe("PASS");
    expect(s.toleranceResults.length).toBe(3);
    expect(s.syncState).toBe("local_only");
    expect(s.createdAt).toBe(endedAt);
    expect(s.startedAt).toBe(startedAt);
    expect(s.endedAt).toBe(endedAt);
    expect(s.operatorUserId).toBe("jdoe");
    expect(s.projectSnapshot?.name).toBe("Site A");
    expect(s.openingSnapshot?.label).toBe("Door 1");
    expect(s.derivedMeasurements.nominalWidthMm).toBe(1001);
    expect(s.derivedMeasurements.nominalHeightMm).toBe(1200);
  });
});
