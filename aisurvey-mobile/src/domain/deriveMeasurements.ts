import type { DerivedMeasurements, MeasurementSet } from "./models";

/** Deterministic MVP rule: nominal width = mid, nominal height = center line */
export function computeDerivedMeasurements(m: MeasurementSet): DerivedMeasurements {
  const widths = [m.widthTop, m.widthMid, m.widthBottom];
  const heights = [m.heightLeft, m.heightCenter, m.heightRight];
  return {
    nominalWidthMm: m.widthMid,
    nominalHeightMm: m.heightCenter,
    widthMinMm: Math.min(...widths),
    widthMaxMm: Math.max(...widths),
    heightMinMm: Math.min(...heights),
    heightMaxMm: Math.max(...heights),
    outOfSquareWidthMm: Math.abs(m.widthTop - m.widthBottom),
    outOfSquareHeightMm: Math.abs(m.heightLeft - m.heightRight),
  };
}
