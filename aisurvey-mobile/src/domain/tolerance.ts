import type { MeasurementSet, ToleranceConfig, ToleranceResult } from "./models";

function statusFor(value: number, limit: number): "PASS" | "FAIL" {
  return value <= limit ? "PASS" : "FAIL";
}

export function evaluateTolerances(
  m: MeasurementSet,
  cfg: ToleranceConfig
): { results: ToleranceResult[]; overall: "PASS" | "FAIL" } {
  const widthRange =
    Math.max(m.widthTop, m.widthMid, m.widthBottom) -
    Math.min(m.widthTop, m.widthMid, m.widthBottom);
  const heightRange =
    Math.max(m.heightLeft, m.heightCenter, m.heightRight) -
    Math.min(m.heightLeft, m.heightCenter, m.heightRight);
  const outOfSquare = Math.max(
    Math.abs(m.widthTop - m.widthBottom),
    Math.abs(m.heightLeft - m.heightRight)
  );

  const results: ToleranceResult[] = [
    {
      check: "widthRange",
      status: statusFor(widthRange, cfg.maxWidthRangeMm),
      valueMm: widthRange,
      limitMm: cfg.maxWidthRangeMm,
    },
    {
      check: "heightRange",
      status: statusFor(heightRange, cfg.maxHeightRangeMm),
      valueMm: heightRange,
      limitMm: cfg.maxHeightRangeMm,
    },
    {
      check: "outOfSquare",
      status: statusFor(outOfSquare, cfg.maxOutOfSquareMm),
      valueMm: outOfSquare,
      limitMm: cfg.maxOutOfSquareMm,
    },
  ];

  const overall = results.some((r) => r.status === "FAIL") ? "FAIL" : "PASS";
  return { results, overall };
}

