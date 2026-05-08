import type { CaptureSession } from "../domain/models";

export function buildSessionPdfHtml(s: CaptureSession): string {
  const tr = (k: string, v: string) => `<tr><td style="padding:6px;border:1px solid #ddd">${k}</td><td style="padding:6px;border:1px solid #ddd">${v}</td></tr>`;
  const tolRows = s.toleranceResults
    .map((r) => `<tr><td style="padding:6px;border:1px solid #ddd">${r.check}</td><td style="padding:6px;border:1px solid #ddd">${r.status}</td><td style="padding:6px;border:1px solid #ddd">${r.valueMm}</td><td style="padding:6px;border:1px solid #ddd">${r.limitMm}</td></tr>`)
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Opening Capture Report</title>
</head>
<body style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial; padding: 24px;">
  <h1 style="margin:0 0 8px;">Opening Capture Report</h1>
  <div style="color:#444;margin-bottom:16px;">Session: <b>${s.sessionId}</b> · Opening: <b>${s.openingId}</b></div>

  <h2 style="margin:24px 0 8px;">Summary</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Created At", s.createdAt)}
    ${tr("Overall Status", s.overallStatus)}
  </table>

  <h2 style="margin:24px 0 8px;">Measurements (mm)</h2>
  <table style="border-collapse:collapse; width:100%; max-width:720px;">
    ${tr("Width (top/mid/bottom)", `${s.measurements.widthTop} / ${s.measurements.widthMid} / ${s.measurements.widthBottom}`)}
    ${tr("Height (left/center/right)", `${s.measurements.heightLeft} / ${s.measurements.heightCenter} / ${s.measurements.heightRight}`)}
    ${tr("Depth (left/right)", `${s.measurements.depthLeft ?? ""} / ${s.measurements.depthRight ?? ""}`)}
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

  <div style="margin-top:24px;color:#666;font-size:12px;">Generated from canonical capture session record (schemaVersion 1).</div>
</body>
</html>`;
}

