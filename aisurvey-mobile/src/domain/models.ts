export type RequiredPhotoKind = "overview" | "leftJamb" | "rightJamb" | "head" | "sill";

export const REQUIRED_PHOTO_KINDS = [
  "overview",
  "leftJamb",
  "rightJamb",
  "head",
  "sill",
] as const satisfies readonly RequiredPhotoKind[];

export type RequiredPhotos = Record<RequiredPhotoKind, string | null>;

export type MeasurementSet = {
  widthTop: number;
  widthMid: number;
  widthBottom: number;
  heightLeft: number;
  heightCenter: number;
  heightRight: number;
  depthLeft?: number | null;
  depthRight?: number | null;
};

export type ToleranceConfig = {
  maxOutOfSquareMm: number;
  maxWidthRangeMm: number;
  maxHeightRangeMm: number;
};

export type ToleranceResult = {
  check: "outOfSquare" | "widthRange" | "heightRange";
  status: "PASS" | "FAIL";
  valueMm: number;
  limitMm: number;
};

export type CaptureSessionDraft = {
  openingId: string;
  requiredPhotos: RequiredPhotos;
  measurements: MeasurementSet;
  toleranceConfig: ToleranceConfig;
};

export type CaptureSession = {
  sessionId: string;
  openingId: string;
  createdAt: string; // ISO
  requiredPhotos: RequiredPhotos;
  measurements: MeasurementSet;
  toleranceConfigSnapshot: ToleranceConfig;
  toleranceResults: ToleranceResult[];
  overallStatus: "PASS" | "FAIL";
  syncState: "local_only" | "queued" | "synced" | "error";
};
