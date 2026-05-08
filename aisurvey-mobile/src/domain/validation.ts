import { z } from "zod";
import type { CaptureSessionDraft, RequiredPhotoKind } from "./models";

const requiredPhotoKinds: RequiredPhotoKind[] = ["overview", "leftJamb", "rightJamb", "head", "sill"];

const RequiredPhotosSchema = z
  .object({
    overview: z.string().nullable(),
    leftJamb: z.string().nullable(),
    rightJamb: z.string().nullable(),
    head: z.string().nullable(),
    sill: z.string().nullable(),
  })
  .superRefine((val, ctx) => {
    for (const k of requiredPhotoKinds) {
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
  widthTop: z.number().positive(),
  widthMid: z.number().positive(),
  widthBottom: z.number().positive(),
  heightLeft: z.number().positive(),
  heightCenter: z.number().positive(),
  heightRight: z.number().positive(),
  depthLeft: z.number().positive().nullable().optional(),
  depthRight: z.number().positive().nullable().optional(),
});

const ToleranceConfigSchema = z.object({
  maxOutOfSquareMm: z.number().positive(),
  maxWidthRangeMm: z.number().positive(),
  maxHeightRangeMm: z.number().positive(),
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
