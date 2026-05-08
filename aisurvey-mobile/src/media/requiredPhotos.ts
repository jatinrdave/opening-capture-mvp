import type { RequiredPhotoKind } from "../domain/models";

export const requiredPhotoKinds: RequiredPhotoKind[] = ["overview", "leftJamb", "rightJamb", "head", "sill"];

export const requiredPhotoLabels: Record<RequiredPhotoKind, string> = {
  overview: "Full opening (overview)",
  leftJamb: "Left jamb (close-up)",
  rightJamb: "Right jamb (close-up)",
  head: "Head (close-up)",
  sill: "Sill/threshold (close-up)",
};
