import type { ToleranceConfig } from "./models";

export type ProjectToleranceRow = {
  defaultMaxOutOfSquareMm: number;
  defaultMaxWidthRangeMm: number;
  defaultMaxHeightRangeMm: number;
  defaultWarnBandMultiplier: number;
};

export type OpeningToleranceRow = {
  overrideMaxOutOfSquareMm: number | null;
  overrideMaxWidthRangeMm: number | null;
  overrideMaxHeightRangeMm: number | null;
};

export function resolveToleranceConfig(project: ProjectToleranceRow, opening: OpeningToleranceRow): ToleranceConfig {
  return {
    maxOutOfSquareMm: opening.overrideMaxOutOfSquareMm ?? project.defaultMaxOutOfSquareMm,
    maxWidthRangeMm: opening.overrideMaxWidthRangeMm ?? project.defaultMaxWidthRangeMm,
    maxHeightRangeMm: opening.overrideMaxHeightRangeMm ?? project.defaultMaxHeightRangeMm,
    warnBandMultiplier: project.defaultWarnBandMultiplier,
  };
}
