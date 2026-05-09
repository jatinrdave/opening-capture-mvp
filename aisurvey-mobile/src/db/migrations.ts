import type { SQLiteDatabase } from "expo-sqlite";

/** Ensures project rows carry tolerance defaults used by the capture wizard. */
export async function ensureProjectToleranceColumns(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>("PRAGMA table_info(projects)");
  const names = new Set(rows.map((r) => r.name));

  if (!names.has("defaultMaxOutOfSquareMm")) {
    await db.execAsync("ALTER TABLE projects ADD COLUMN defaultMaxOutOfSquareMm REAL DEFAULT 10;");
  }
  if (!names.has("defaultMaxWidthRangeMm")) {
    await db.execAsync("ALTER TABLE projects ADD COLUMN defaultMaxWidthRangeMm REAL DEFAULT 4;");
  }
  if (!names.has("defaultMaxHeightRangeMm")) {
    await db.execAsync("ALTER TABLE projects ADD COLUMN defaultMaxHeightRangeMm REAL DEFAULT 4;");
  }
}

export async function ensureProjectWarnMultiplier(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>("PRAGMA table_info(projects)");
  const names = new Set(rows.map((r) => r.name));
  if (!names.has("defaultWarnBandMultiplier")) {
    await db.execAsync("ALTER TABLE projects ADD COLUMN defaultWarnBandMultiplier REAL DEFAULT 1.5;");
  }
}

export async function ensureOpeningExtendedColumns(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>("PRAGMA table_info(openings)");
  const names = new Set(rows.map((r) => r.name));
  if (!names.has("locationNotes")) {
    await db.execAsync("ALTER TABLE openings ADD COLUMN locationNotes TEXT DEFAULT '';");
  }
  if (!names.has("openingType")) {
    await db.execAsync("ALTER TABLE openings ADD COLUMN openingType TEXT DEFAULT '';");
  }
  if (!names.has("overrideMaxOutOfSquareMm")) {
    await db.execAsync("ALTER TABLE openings ADD COLUMN overrideMaxOutOfSquareMm REAL;");
  }
  if (!names.has("overrideMaxWidthRangeMm")) {
    await db.execAsync("ALTER TABLE openings ADD COLUMN overrideMaxWidthRangeMm REAL;");
  }
  if (!names.has("overrideMaxHeightRangeMm")) {
    await db.execAsync("ALTER TABLE openings ADD COLUMN overrideMaxHeightRangeMm REAL;");
  }
}

export async function ensureSessionsRecordJson(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>("PRAGMA table_info(sessions)");
  const names = new Set(rows.map((r) => r.name));
  if (!names.has("recordJson")) {
    await db.execAsync("ALTER TABLE sessions ADD COLUMN recordJson TEXT;");
  }
}

export async function ensureSyncQueue(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
CREATE TABLE IF NOT EXISTS sync_queue (
  sessionId TEXT PRIMARY KEY,
  openingId TEXT NOT NULL,
  enqueuedAt TEXT NOT NULL,
  status TEXT NOT NULL,
  FOREIGN KEY(sessionId) REFERENCES sessions(sessionId),
  FOREIGN KEY(openingId) REFERENCES openings(openingId)
);
`);
}

/** Site / address metadata on projects (MVP spec: address/site metadata). */
export async function ensureProjectSiteColumns(db: SQLiteDatabase): Promise<void> {
  const rows = await db.getAllAsync<{ name: string }>("PRAGMA table_info(projects)");
  const names = new Set(rows.map((r) => r.name));
  if (!names.has("siteAddress")) {
    await db.execAsync("ALTER TABLE projects ADD COLUMN siteAddress TEXT DEFAULT '';");
  }
  if (!names.has("siteNotes")) {
    await db.execAsync("ALTER TABLE projects ADD COLUMN siteNotes TEXT DEFAULT '';");
  }
}

export async function runAllMigrations(db: SQLiteDatabase): Promise<void> {
  await ensureProjectToleranceColumns(db);
  await ensureProjectWarnMultiplier(db);
  await ensureProjectSiteColumns(db);
  await ensureOpeningExtendedColumns(db);
  await ensureSessionsRecordJson(db);
  await ensureSyncQueue(db);
}
