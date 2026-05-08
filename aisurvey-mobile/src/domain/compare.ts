import type { MeasurementSet } from "./models";

export function diffMeasurements(a: MeasurementSet, b: MeasurementSet) {
  return {
    widthTopDelta: b.widthTop - a.widthTop,
    widthMidDelta: b.widthMid - a.widthMid,
    widthBottomDelta: b.widthBottom - a.widthBottom,
    heightLeftDelta: b.heightLeft - a.heightLeft,
    heightCenterDelta: b.heightCenter - a.heightCenter,
    heightRightDelta: b.heightRight - a.heightRight,
  };
}
