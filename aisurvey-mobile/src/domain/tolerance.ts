import type { MeasurementSet, ToleranceConfig, ToleranceResult } from "./models";

function triStatus(value: number, passLimitMm: number, multiplier: number): "PASS" | "WARN" | "FAIL" {
  const warnCeiling = passLimitMm * multiplier;
  if (value <= passLimitMm) return "PASS";
  if (value <= warnCeiling) return "WARN";
  return "FAIL";
}

function overallRank(r: ToleranceResult["status"]): number {
  switch (r) {
    case "PASS":
      return 0;
    case "WARN":
      return 1;
    case "FAIL":
      return 2;
  }
}

export function evaluateTolerances(
  m: MeasurementSet,
  cfg: ToleranceConfig
): { results: ToleranceResult[]; overall: "PASS" | "WARN" | "FAIL" } {
  const mult = cfg.warnBandMultiplier;

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

  const widthSts = triStatus(widthRange, cfg.maxWidthRangeMm, mult);
  const heightSts = triStatus(heightRange, cfg.maxHeightRangeMm, mult);
  const sqSts = triStatus(outOfSquare, cfg.maxOutOfSquareMm, mult);

  const results: ToleranceResult[] = [
    {
      check: "widthRange",
      status: widthSts,
      valueMm: widthRange,
      limitMm: cfg.maxWidthRangeMm,
    },
    {
      check: "heightRange",
      status: heightSts,
      valueMm: heightRange,
      limitMm: cfg.maxHeightRangeMm,
    },
    {
      check: "outOfSquare",
      status: sqSts,
      valueMm: outOfSquare,
      limitMm: cfg.maxOutOfSquareMm,
    },
  ];

  let overall: "PASS" | "WARN" | "FAIL" = "PASS";
  let rank = 0;
  for (const r of results) {
    const rr = overallRank(r.status);
    if (rr > rank) {
      rank = rr;
      overall = r.status;
    }
  }

  return { results, overall };
}

/** Exported helper retained for tests / callers that need PASS/FAIL-only thresholds */
export function statusFor(value: number, limit: number): "PASS" | "FAIL" {
  return value <= limit ? "PASS" : "FAIL";
}
