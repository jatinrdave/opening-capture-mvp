import type { CaptureSession } from "../domain/models";

export function buildSessionJson(s: CaptureSession): string {
  return JSON.stringify(
    {
      schemaVersion: 1,
      ...s,
    },
    null,
    2
  );
}

