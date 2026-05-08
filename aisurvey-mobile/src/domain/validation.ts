import { z } from "zod";
import { REQUIRED_PHOTO_KINDS, type CaptureSessionDraft } from "./models";

const positiveFiniteNumber = () => z.number().finite().gt(0);

const RequiredPhotosSchema = z
  .object({
    overview: z.string().trim().min(1).nullable(),
    leftJamb: z.string().trim().min(1).nullable(),
    rightJamb: z.string().trim().min(1).nullable(),
    head: z.string().trim().min(1).nullable(),
    sill: z.string().trim().min(1).nullable(),
  })
  .superRefine((val, ctx) => {
    for (const k of REQUIRED_PHOTO_KINDS) {
      if (!val[k]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required photo: ${k}`,
          path: [k],
        });
      }
    }
  });

const MeasurementSetSchema = z.object({
  widthTop: positiveFiniteNumber(),
  widthMid: positiveFiniteNumber(),
  widthBottom: positiveFiniteNumber(),
  heightLeft: positiveFiniteNumber(),
  heightCenter: positiveFiniteNumber(),
  heightRight: positiveFiniteNumber(),
  depthLeft: positiveFiniteNumber().nullable().optional(),
  depthRight: positiveFiniteNumber().nullable().optional(),
});

const ToleranceConfigSchema = z.object({
  maxOutOfSquareMm: positiveFiniteNumber(),
  maxWidthRangeMm: positiveFiniteNumber(),
  maxHeightRangeMm: positiveFiniteNumber(),
});

const CaptureSessionDraftSchema = z.object({
  openingId: z.string().min(1),
  requiredPhotos: RequiredPhotosSchema,
  measurements: MeasurementSetSchema,
  toleranceConfig: ToleranceConfigSchema,
});

export function parseCaptureSessionDraft(
  input: unknown
):
  | { success: true; data: CaptureSessionDraft }
  | { success: false; error: z.ZodError } {
  const parsed = CaptureSessionDraftSchema.safeParse(input);
  if (parsed.success) return { success: true, data: parsed.data };
  return { success: false, error: parsed.error };
}
