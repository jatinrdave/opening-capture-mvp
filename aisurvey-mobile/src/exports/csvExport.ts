import type { CaptureSession } from "../domain/models";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

function cell(v: unknown): string {
  return String(v ?? "");
}

export function buildSessionCsv(s: CaptureSession): string {
  const rows: [string, string][] = [
    ["sessionId", cell(s.sessionId)],
    ["openingId", cell(s.openingId)],
    ["createdAt", cell(s.createdAt)],
    ["startedAt", cell(s.startedAt)],
    ["endedAt", cell(s.endedAt)],
    ["offlineCaptured", cell(s.offlineCaptured)],
    ["operatorUserId", cell(s.operatorUserId)],
    ["overallStatus", cell(s.overallStatus)],
    ["syncState", cell(s.syncState)],
    ["projectId", cell(s.projectSnapshot?.projectId)],
    ["projectName", cell(s.projectSnapshot?.name)],
    ["projectSiteAddress", cell(s.projectSnapshot?.siteAddress)],
    ["projectSiteNotes", cell(s.projectSnapshot?.siteNotes)],
    ["openingLabel", cell(s.openingSnapshot?.label)],
    ["openingLocationNotes", cell(s.openingSnapshot?.locationNotes)],
    ["openingType", cell(s.openingSnapshot?.openingType)],
    ["deviceManufacturer", cell(s.device.manufacturer)],
    ["deviceModel", cell(s.device.modelName)],
    ["deviceOs", cell(s.device.osName)],
    ["deviceOsVersion", cell(s.device.osVersion)],
    ["appVersion", cell(s.device.appVersion)],
    ["locationStatus", cell(s.location.status)],
    [
      "latitude",
      s.location.status === "granted" ? cell(s.location.latitude) : "",
    ],
    [
      "longitude",
      s.location.status === "granted" ? cell(s.location.longitude) : "",
    ],
    [
      "locationUnavailableReason",
      s.location.status === "unavailable" ? cell(s.location.reason) : "",
    ],
    ["nominalWidthMm", cell(s.derivedMeasurements.nominalWidthMm)],
    ["nominalHeightMm", cell(s.derivedMeasurements.nominalHeightMm)],
    ["widthMinMm", cell(s.derivedMeasurements.widthMinMm)],
    ["widthMaxMm", cell(s.derivedMeasurements.widthMaxMm)],
    ["heightMinMm", cell(s.derivedMeasurements.heightMinMm)],
    ["heightMaxMm", cell(s.derivedMeasurements.heightMaxMm)],
    ["outOfSquareWidthMm", cell(s.derivedMeasurements.outOfSquareWidthMm)],
    ["outOfSquareHeightMm", cell(s.derivedMeasurements.outOfSquareHeightMm)],
    ["widthTop", cell(s.measurements.widthTop)],
    ["widthMid", cell(s.measurements.widthMid)],
    ["widthBottom", cell(s.measurements.widthBottom)],
    ["heightLeft", cell(s.measurements.heightLeft)],
    ["heightCenter", cell(s.measurements.heightCenter)],
    ["heightRight", cell(s.measurements.heightRight)],
    ["depthLeft", cell(s.measurements.depthLeft)],
    ["depthRight", cell(s.measurements.depthRight)],
    ["measurementNotes", cell(s.measurements.notes)],
    ["measurementAnnotationRefs", cell((s.measurements.annotationRefs ?? []).join("; "))],
    ["warnBandMultiplier", cell(s.toleranceConfigSnapshot.warnBandMultiplier)],
    ["signOffReviewer", cell(s.signOff?.reviewerName)],
    ["signOffReviewedAt", cell(s.signOff?.reviewedAt)],
    ["signOffHasSignature", s.signOff?.signatureUri ? "yes" : "no"],
  ];

  for (const r of s.toleranceResults) {
    rows.push([`tol_${r.check}_status`, cell(r.status)]);
    rows.push([`tol_${r.check}_valueMm`, cell(r.valueMm)]);
    rows.push([`tol_${r.check}_limitMm`, cell(r.limitMm)]);
  }

  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}
