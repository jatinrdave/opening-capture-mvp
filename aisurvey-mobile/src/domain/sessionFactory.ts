import type { CaptureSession, CaptureSessionDraft } from "./models";
import { newId } from "./ids";
import { parseCaptureSessionDraft } from "./validation";
import { evaluateTolerances } from "./tolerance";

export function createCaptureSession(input: CaptureSessionDraft): CaptureSession {
  const parsed = parseCaptureSessionDraft(input);
  if (!parsed.success) {
    throw parsed.error;
  }

  const { results, overall } = evaluateTolerances(parsed.data.measurements, parsed.data.toleranceConfig);

  return {
    sessionId: newId("session"),
    openingId: parsed.data.openingId,
    createdAt: new Date().toISOString(),
    requiredPhotos: parsed.data.requiredPhotos,
    measurements: parsed.data.measurements,
    toleranceConfigSnapshot: parsed.data.toleranceConfig,
    toleranceResults: results,
    overallStatus: overall,
    syncState: "local_only",
  };
}

