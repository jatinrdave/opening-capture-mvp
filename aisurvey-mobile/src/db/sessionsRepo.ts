import { computeDerivedMeasurements } from "../domain/deriveMeasurements";
import { SCHEMA_VERSION, type CaptureSession, type ToleranceConfig } from "../domain/models";
import { getDb } from "./db";

function coerceOverallStatus(v: string): CaptureSession["overallStatus"] {
  if (v === "PASS" || v === "WARN" || v === "FAIL") return v;
  return "PASS";
}

function normalizeToleranceSnapshot(raw: Record<string, unknown>): ToleranceConfig {
  return {
    maxOutOfSquareMm: Number(raw.maxOutOfSquareMm),
    maxWidthRangeMm: Number(raw.maxWidthRangeMm),
    maxHeightRangeMm: Number(raw.maxHeightRangeMm),
    warnBandMultiplier:
      typeof raw.warnBandMultiplier === "number" && Number.isFinite(raw.warnBandMultiplier) && raw.warnBandMultiplier > 1
        ? raw.warnBandMultiplier
        : 1.5,
  };
}

function hydrateLegacySession(row: {
  sessionId: string;
  openingId: string;
  createdAt: string;
  syncState: CaptureSession["syncState"];
  requiredPhotosJson: string;
  measurementsJson: string;
  toleranceConfigJson: string;
  toleranceResultsJson: string;
  overallStatus: string;
}): CaptureSession {
  const measurements = JSON.parse(row.measurementsJson) as CaptureSession["measurements"];
  const toleranceConfigSnapshot = normalizeToleranceSnapshot(JSON.parse(row.toleranceConfigJson) as Record<string, unknown>);
  const toleranceResults = JSON.parse(row.toleranceResultsJson) as CaptureSession["toleranceResults"];
  const derivedMeasurements = computeDerivedMeasurements(measurements);

  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId: row.sessionId,
    openingId: row.openingId,
    createdAt: row.createdAt,
    startedAt: row.createdAt,
    endedAt: row.createdAt,
    operatorUserId: "legacy-import",
    offlineCaptured: true,
    device: {},
    location: { status: "unavailable", reason: "Legacy capture record (pre-schema v2 migration)" },
    projectSnapshot: null,
    openingSnapshot: null,
    requiredPhotos: JSON.parse(row.requiredPhotosJson),
    measurements,
    derivedMeasurements,
    manualPlumbLevel: null,
    mediaArtifacts: null,
    toleranceConfigSnapshot,
    toleranceResults,
    overallStatus: coerceOverallStatus(row.overallStatus),
    syncState: row.syncState,
    signOff: null,
    exports: null,
  };
}

export async function insertSession(s: CaptureSession): Promise<void> {
  const db = await getDb();
  const recordJson = JSON.stringify(s);
  await db.runAsync(
    `INSERT INTO sessions (
      sessionId, openingId, createdAt, syncState,
      requiredPhotosJson, measurementsJson,
      toleranceConfigJson, toleranceResultsJson,
      overallStatus, recordJson
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      recordJson,
    ]
  );
  await db.runAsync(`INSERT OR REPLACE INTO sync_queue (sessionId, openingId, enqueuedAt, status) VALUES (?, ?, ?, ?)`, [
    s.sessionId,
    s.openingId,
    new Date().toISOString(),
    "pending",
  ]);
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
    overallStatus: string;
    recordJson: string | null;
  }>(
    `SELECT
      sessionId, openingId, createdAt, syncState,
      requiredPhotosJson, measurementsJson,
      toleranceConfigJson, toleranceResultsJson,
      overallStatus, recordJson
     FROM sessions WHERE sessionId = ?`,
    [sessionId]
  );

  if (!row) return null;

  if (row.recordJson) {
    try {
      const parsed = JSON.parse(row.recordJson) as CaptureSession;
      if (parsed.schemaVersion === SCHEMA_VERSION) return parsed;
    } catch {
      /* fall through */
    }
  }

  return hydrateLegacySession(row);
}

export async function updateSessionRecord(s: CaptureSession): Promise<void> {
  const db = await getDb();
  const recordJson = JSON.stringify(s);
  await db.runAsync(
    `UPDATE sessions SET
      recordJson = ?,
      requiredPhotosJson = ?,
      measurementsJson = ?,
      toleranceConfigJson = ?,
      toleranceResultsJson = ?,
      overallStatus = ?,
      syncState = ?,
      createdAt = ?
    WHERE sessionId = ?`,
    [
      recordJson,
      JSON.stringify(s.requiredPhotos),
      JSON.stringify(s.measurements),
      JSON.stringify(s.toleranceConfigSnapshot),
      JSON.stringify(s.toleranceResults),
      s.overallStatus,
      s.syncState,
      s.createdAt,
      s.sessionId,
    ]
  );
}

export async function listSyncQueue(): Promise<
  { sessionId: string; openingId: string; enqueuedAt: string; status: string }[]
> {
  const db = await getDb();
  return await db.getAllAsync(`SELECT sessionId, openingId, enqueuedAt, status FROM sync_queue ORDER BY enqueuedAt DESC`);
}

export async function retrySyncQueueMarkQueued(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE sync_queue SET status = 'pending', enqueuedAt = ? WHERE sessionId = ?`, [
    new Date().toISOString(),
    sessionId,
  ]);
}
