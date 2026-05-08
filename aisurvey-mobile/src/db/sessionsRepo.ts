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

export async function getSessionById(sessionId: string): Promise<CaptureSession | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    sessionId: string;
    openingId: string;
    createdAt: string;
    syncState: CaptureSession["syncState"];
    requiredPhotosJson: string;
    measurementsJson: string;
    toleranceConfigJson: string;
    toleranceResultsJson: string;
    overallStatus: CaptureSession["overallStatus"];
  }>(
    `SELECT
      sessionId, openingId, createdAt, syncState,
      requiredPhotosJson, measurementsJson,
      toleranceConfigJson, toleranceResultsJson,
      overallStatus
     FROM sessions WHERE sessionId = ?`,
    [sessionId]
  );

  if (!row) return null;

  return {
    sessionId: row.sessionId,
    openingId: row.openingId,
    createdAt: row.createdAt,
    syncState: row.syncState,
    requiredPhotos: JSON.parse(row.requiredPhotosJson),
    measurements: JSON.parse(row.measurementsJson),
    toleranceConfigSnapshot: JSON.parse(row.toleranceConfigJson),
    toleranceResults: JSON.parse(row.toleranceResultsJson),
    overallStatus: row.overallStatus,
  };
}

