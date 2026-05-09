export const SCHEMA_VERSION = 2 as const;

export type RequiredPhotoKind = "overview" | "leftJamb" | "rightJamb" | "head" | "sill";

export const REQUIRED_PHOTO_KINDS = [
  "overview",
  "leftJamb",
  "rightJamb",
  "head",
  "sill",
] as const satisfies readonly RequiredPhotoKind[];

export type RequiredPhotos = Record<RequiredPhotoKind, string | null>;

/** Raw numeric captures plus optional notes per MVP MeasurementSet spec */
export type MeasurementSet = {
  widthTop: number;
  widthMid: number;
  widthBottom: number;
  heightLeft: number;
  heightCenter: number;
  heightRight: number;
  depthLeft?: number | null;
  depthRight?: number | null;
  notes?: string | null;
  annotationRefs?: string[];
};

/** Resolved thresholds copied onto session at capture time */
export type ToleranceConfig = {
  maxOutOfSquareMm: number;
  maxWidthRangeMm: number;
  maxHeightRangeMm: number;
  /**
   * Measurements beyond the PASS threshold but <= PASS × multiplier evaluate as WARN;
   * above PASS × multiplier is FAIL.
   */
  warnBandMultiplier: number;
};

export type ToleranceResult = {
  check: "outOfSquare" | "widthRange" | "heightRange";
  status: "PASS" | "WARN" | "FAIL";
  valueMm: number;
  limitMm: number;
};

export type DeviceSnapshot = {
  manufacturer?: string | null;
  modelName?: string | null;
  osName?: string | null;
  osVersion?: string | null;
  appVersion?: string | null;
};

export type LocationSnapshot =
  | { status: "granted"; latitude: number; longitude: number; accuracyM?: number | null }
  | { status: "unavailable"; reason: string };

/** Nominals rule from MVP spec: mid width × center height, plus min/max for auditability */
export type DerivedMeasurements = {
  nominalWidthMm: number;
  nominalHeightMm: number;
  widthMinMm: number;
  widthMaxMm: number;
  heightMinMm: number;
  heightMaxMm: number;
  outOfSquareWidthMm: number;
  outOfSquareHeightMm: number;
};

export type ManualPlumbLevel = {
  plumbAssessment?: string | null;
  levelAssessment?: string | null;
};

export type SignOff = {
  reviewerName: string;
  signatureUri?: string | null;
  reviewedAt: string;
};

export type MediaArtifacts = {
  optionalDepthArtifactUri?: string | null;
  optionalVideoUri?: string | null;
};

export type ProjectSnapshot = {
  projectId: string;
  name: string;
  /** Site address / location line (optional). */
  siteAddress?: string | null;
  /** Free-form site context (optional). */
  siteNotes?: string | null;
};

export type OpeningSnapshot = {
  openingId: string;
  label: string;
  locationNotes?: string | null;
  openingType?: string | null;
};

export type ExportRefs = {
  pdfPath?: string | null;
  jsonPath?: string | null;
  csvPath?: string | null;
  generatedAt?: string | null;
};

export type CaptureSessionDraft = {
  openingId: string;
  requiredPhotos: RequiredPhotos;
  measurements: MeasurementSet;
  toleranceConfig: ToleranceConfig;
};

export type CaptureSession = {
  schemaVersion: typeof SCHEMA_VERSION;
  sessionId: string;
  openingId: string;
  /** Persist/comparable anchor — aligns with legacy DB column */
  createdAt: string;
  startedAt: string;
  endedAt: string;
  operatorUserId: string;
  offlineCaptured: boolean;
  device: DeviceSnapshot;
  location: LocationSnapshot;
  projectSnapshot?: ProjectSnapshot | null;
  openingSnapshot?: OpeningSnapshot | null;
  requiredPhotos: RequiredPhotos;
  measurements: MeasurementSet;
  derivedMeasurements: DerivedMeasurements;
  manualPlumbLevel?: ManualPlumbLevel | null;
  mediaArtifacts?: MediaArtifacts | null;
  toleranceConfigSnapshot: ToleranceConfig;
  toleranceResults: ToleranceResult[];
  overallStatus: "PASS" | "WARN" | "FAIL";
  syncState: "local_only" | "queued" | "synced" | "error";
  signOff?: SignOff | null;
  exports?: ExportRefs | null;
};
