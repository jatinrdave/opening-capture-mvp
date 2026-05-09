import type {
  CaptureSession,
  CaptureSessionDraft,
  DeviceSnapshot,
  LocationSnapshot,
  ManualPlumbLevel,
  MediaArtifacts,
  OpeningSnapshot,
  ProjectSnapshot,
} from "./models";
import { SCHEMA_VERSION } from "./models";
import { computeDerivedMeasurements } from "./deriveMeasurements";
import { newId } from "./ids";
import { parseCaptureSessionDraft } from "./validation";
import { evaluateTolerances } from "./tolerance";

export type SessionWizardPayload = {
  draft: CaptureSessionDraft;
  startedAt: string;
  endedAt: string;
  operatorUserId: string;
  offlineCaptured: boolean;
  device: DeviceSnapshot;
  location: LocationSnapshot;
  projectSnapshot?: ProjectSnapshot | null;
  openingSnapshot?: OpeningSnapshot | null;
  manualPlumbLevel?: ManualPlumbLevel | null;
  mediaArtifacts?: MediaArtifacts | null;
};

export function createCaptureSession(payload: SessionWizardPayload): CaptureSession {
  const parsed = parseCaptureSessionDraft(payload.draft);
  if (!parsed.success) {
    throw parsed.error;
  }

  const derivedMeasurements = computeDerivedMeasurements(parsed.data.measurements);
  const { results, overall } = evaluateTolerances(parsed.data.measurements, parsed.data.toleranceConfig);

  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId: newId("session"),
    openingId: parsed.data.openingId,
    createdAt: payload.endedAt,
    startedAt: payload.startedAt,
    endedAt: payload.endedAt,
    operatorUserId: payload.operatorUserId.trim(),
    offlineCaptured: payload.offlineCaptured,
    device: payload.device,
    location: payload.location,
    projectSnapshot: payload.projectSnapshot ?? null,
    openingSnapshot: payload.openingSnapshot ?? null,
    requiredPhotos: parsed.data.requiredPhotos,
    measurements: parsed.data.measurements,
    derivedMeasurements,
    manualPlumbLevel: payload.manualPlumbLevel ?? null,
    mediaArtifacts: payload.mediaArtifacts ?? null,
    toleranceConfigSnapshot: parsed.data.toleranceConfig,
    toleranceResults: results,
    overallStatus: overall,
    syncState: "local_only",
    signOff: null,
    exports: null,
  };
}
