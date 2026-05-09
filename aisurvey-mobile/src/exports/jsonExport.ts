import type { CaptureSession } from "../domain/models";

/** Portable envelope so integrations can version exports independently of in-app schemaVersion. */
export function buildSessionJson(s: CaptureSession): string {
  return JSON.stringify(
    {
      exportSchemaVersion: 2,
      session: s,
    },
    null,
    2
  );
}
