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
