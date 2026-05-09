import * as FileSystem from "expo-file-system/legacy";
import QRCode from "qrcode";

import type { CaptureSession } from "../domain/models";

function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fileUriToDataUrl(uri: string): Promise<string | null> {
  try {
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const lower = uri.toLowerCase();
    const mime = lower.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

export async function buildSessionPdfHtml(s: CaptureSession): Promise<string> {
  const tr = (k: string, v: string) =>
    `<tr><td style="padding:6px;border:1px solid #ddd">${escapeHtml(k)}</td><td style="padding:6px;border:1px solid #ddd">${escapeHtml(v)}</td></tr>`;

  const qrDataUrl = await QRCode.toDataURL(s.sessionId, { width: 200, margin: 1, errorCorrectionLevel: "M" });

  const overview = s.requiredPhotos.overview ? await fileUriToDataUrl(s.requiredPhotos.overview) : null;
  const closeup = s.requiredPhotos.leftJamb ? await fileUriToDataUrl(s.requiredPhotos.leftJamb) : null;
  const sig = s.signOff?.signatureUri ? await fileUriToDataUrl(s.signOff.signatureUri) : null;

  const tolRows = s.toleranceResults
    .map(
      (r) =>
        `<tr><td style="padding:6px;border:1px solid #ddd">${escapeHtml(r.check)}</td><td style="padding:6px;border:1px solid #ddd">${escapeHtml(r.status)}</td><td style="padding:6px;border:1px solid #ddd">${escapeHtml(r.valueMm)}</td><td style="padding:6px;border:1px solid #ddd">${escapeHtml(r.limitMm)}</td></tr>`
    )
    .join("");

  const locLine =
    s.location.status === "granted"
      ? `${s.location.latitude.toFixed(6)}, ${s.location.longitude.toFixed(6)}`
      : s.location.reason;

  const projectLine = s.projectSnapshot ? `${s.projectSnapshot.name} (${s.projectSnapshot.projectId})` : "";
  const openingLine = s.openingSnapshot
    ? `${s.openingSnapshot.label} (${s.openingSnapshot.openingId})`
    : `${s.openingId}`;

  const imgBlock = (title: string, dataUrl: string | null) =>
    dataUrl
      ? `<div style="margin-bottom:16px;"><div style="font-weight:700;margin-bottom:6px;">${escapeHtml(title)}</div><img src="${dataUrl}" style="max-width:100%;border:1px solid #eee;border-radius:8px;" /></div>`
      : `<div style="margin-bottom:16px;color:#888;">${escapeHtml(title)}: unavailable</div>`;

  const manualPlumb =
    s.manualPlumbLevel?.plumbAssessment || s.manualPlumbLevel?.levelAssessment
      ? `<h2 style="margin:24px 0 8px;">Manual plumb / level</h2>
        <table style="border-collapse:collapse; width:100%; max-width:720px;">
          ${tr("Plumb (manual)", s.manualPlumbLevel?.plumbAssessment ?? "")}
          ${tr("Level (manual)", s.manualPlumbLevel?.levelAssessment ?? "")}
        </table>`
      : "";

  const signOffBlock =
    s.signOff && s.signOff.reviewerName.trim().length > 0
      ? `<h2 style="margin:24px 0 8px;">Sign-off</h2>
        <table style="border-collapse:collapse; width:100%; max-width:720px;">
          ${tr("Reviewer", s.signOff.reviewerName)}
          ${tr("Reviewed at", s.signOff.reviewedAt)}
        </table>
        ${sig ? `<div style="margin-top:12px;"><div style="font-weight:700;margin-bottom:6px;">Signature</div><img src="${sig}" style="max-height:160px;border:1px solid #eee;border-radius:8px;" /></div>` : "<p style=\"color:#666;font-size:13px;\">No signature image captured.</p>"}`
      : `<h2 style="margin:24px 0 8px;">Sign-off</h2><p style="color:#666;font-size:13px;">Pending review / sign-off.</p>`;

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opening Capture Report</title>
</head>
<body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px;">
  <h1 style="margin:0 0 8px;">Opening Capture Report</h1>
  <div style="color:#444;margin-bottom:16px;">Session: <b>${escapeHtml(s.sessionId)}</b></div>

  <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;margin-bottom:16px;">
    <div style="flex:1;min-width:220px;">
      <div style="font-weight:700;margin-bottom:6px;">Session QR</div>
      <img src="${qrDataUrl}" alt="session qr" width="180" height="180" style="border:1px solid #eee;padding:8px;border-radius:8px;" />
      <div style="font-size:11px;color:#666;margin-top:6px;">Scan references session id for retrieval.</div>
    </div>
  </div>

  <h2 style="margin:24px 0 8px;">Project / opening</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Project", projectLine)}
    ${tr("Opening", openingLine)}
    ${tr("Opening location notes", s.openingSnapshot?.locationNotes ?? "")}
    ${tr("Opening type", s.openingSnapshot?.openingType ?? "")}
    ${tr("Project site address", s.projectSnapshot?.siteAddress ?? "")}
    ${tr("Project site notes", s.projectSnapshot?.siteNotes ?? "")}
  </table>

  <h2 style="margin:24px 0 8px;">Summary</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Created At", s.createdAt)}
    ${tr("Capture started", s.startedAt)}
    ${tr("Capture ended", s.endedAt)}
    ${tr("Overall Status", s.overallStatus)}
    ${tr("Offline captured", String(s.offlineCaptured))}
    ${tr("Operator", s.operatorUserId)}
    ${tr("Sync state", s.syncState)}
  </table>

  <h2 style="margin:24px 0 8px;">Device & location</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Device", `${s.device.manufacturer ?? ""} ${s.device.modelName ?? ""}`.trim())}
    ${tr("OS", `${s.device.osName ?? ""} ${s.device.osVersion ?? ""}`.trim())}
    ${tr("App version", s.device.appVersion ?? "")}
    ${tr("GPS / location", locLine)}
  </table>

  <h2 style="margin:24px 0 8px;">Derived (mm)</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Nominal width (mid)", String(s.derivedMeasurements.nominalWidthMm))}
    ${tr("Nominal height (center)", String(s.derivedMeasurements.nominalHeightMm))}
    ${tr("Width min / max", `${s.derivedMeasurements.widthMinMm} / ${s.derivedMeasurements.widthMaxMm}`)}
    ${tr("Height min / max", `${s.derivedMeasurements.heightMinMm} / ${s.derivedMeasurements.heightMaxMm}`)}
    ${tr("Out-of-square Δ width / height", `${s.derivedMeasurements.outOfSquareWidthMm} / ${s.derivedMeasurements.outOfSquareHeightMm}`)}
  </table>

  <h2 style="margin:24px 0 8px;">Measurements (mm)</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Width (top/mid/bottom)", `${s.measurements.widthTop} / ${s.measurements.widthMid} / ${s.measurements.widthBottom}`)}
    ${tr("Height (left/center/right)", `${s.measurements.heightLeft} / ${s.measurements.heightCenter} / ${s.measurements.heightRight}`)}
    ${tr("Depth (left/right)", `${s.measurements.depthLeft ?? ""} / ${s.measurements.depthRight ?? ""}`)}
    ${tr("Measurement notes", s.measurements.notes ?? "")}
    ${tr("Annotation refs (URIs)", (s.measurements.annotationRefs ?? []).join("; "))}
  </table>

  ${manualPlumb}

  <h2 style="margin:24px 0 8px;">Tolerance snapshot</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Warn band multiplier", String(s.toleranceConfigSnapshot.warnBandMultiplier))}
    ${tr("Max out-of-square", String(s.toleranceConfigSnapshot.maxOutOfSquareMm))}
    ${tr("Max width range", String(s.toleranceConfigSnapshot.maxWidthRangeMm))}
    ${tr("Max height range", String(s.toleranceConfigSnapshot.maxHeightRangeMm))}
  </table>

  <h2 style="margin:24px 0 8px;">Tolerance Checks</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    <tr>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Check</th>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Status</th>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Value (mm)</th>
      <th style="text-align:left;padding:6px;border:1px solid #ddd">Limit (mm)</th>
    </tr>
    ${tolRows}
  </table>

  <h2 style="margin:24px 0 8px;">Selected photos</h2>
  ${imgBlock("Overview", overview)}
  ${imgBlock("Close-up (left jamb)", closeup)}

  ${signOffBlock}

  <div style="margin-top:24px;color:#666;font-size:12px;">Generated from canonical capture session record (export schema v2).</div>
</body>
</html>`;
}
