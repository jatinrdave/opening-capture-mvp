import { getDb } from "./db";
import type { CaptureSession } from "../domain/models";

export async function insertSession(s: CaptureSession): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO sessions (
      sessionId, openingId, createdAt, syncState,
      requiredPhotosJson, measurementsJson,
      toleranceConfigJson, toleranceResultsJson,
      overallStatus
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.sessionId,
      s.openingId,
      s.createdAt,
      s.syncState,
      JSON.stringify(s.requiredPhotos),
      JSON.stringify(s.measurements),
      JSON.stringify(s.toleranceConfigSnapshot),
      JSON.stringify(s.toleranceResults),
      s.overallStatus,
    ]
  );
}

export async function listSessions(openingId: string): Promise<{ sessionId: string; createdAt: string; overallStatus: string }[]> {
  const db = await getDb();
  return await db.getAllAsync(
    "SELECT sessionId, createdAt, overallStatus FROM sessions WHERE openingId = ? ORDER BY createdAt DESC",
    [openingId]
  );
}

