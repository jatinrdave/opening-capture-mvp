import type { CaptureSession } from "../domain/models";

function esc(v: unknown): string {
  const s = String(v ?? "");
  return `"${s.replaceAll('"', '""')}"`;
}

export function buildSessionCsv(s: CaptureSession): string {
  const rows: string[][] = [
    ["sessionId", s.sessionId],
    ["openingId", s.openingId],
    ["createdAt", s.createdAt],
    ["overallStatus", s.overallStatus],
    ["widthTop", s.measurements.widthTop],
    ["widthMid", s.measurements.widthMid],
    ["widthBottom", s.measurements.widthBottom],
    ["heightLeft", s.measurements.heightLeft],
    ["heightCenter", s.measurements.heightCenter],
    ["heightRight", s.measurements.heightRight],
    ["depthLeft", s.measurements.depthLeft ?? ""],
    ["depthRight", s.measurements.depthRight ?? ""],
  ];

  for (const r of s.toleranceResults) {
    rows.push([`tol_${r.check}_status`, r.status]);
    rows.push([`tol_${r.check}_valueMm`, r.valueMm]);
    rows.push([`tol_${r.check}_limitMm`, r.limitMm]);
  }

  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

