import { getDb } from "./db";

/** Defaults applied to new projects and used when legacy rows lack explicit values. */
export const PROJECT_TOLERANCE_DEFAULTS = {
  maxOutOfSquareMm: 10,
  maxWidthRangeMm: 4,
  maxHeightRangeMm: 4,
} as const;

export type ProjectRow = {
  projectId: string;
  name: string;
  createdAt: string;
  defaultMaxOutOfSquareMm: number;
  defaultMaxWidthRangeMm: number;
  defaultMaxHeightRangeMm: number;
};

export async function createProject(projectId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO projects (
      projectId, name, createdAt,
      defaultMaxOutOfSquareMm, defaultMaxWidthRangeMm, defaultMaxHeightRangeMm
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      name,
      new Date().toISOString(),
      PROJECT_TOLERANCE_DEFAULTS.maxOutOfSquareMm,
      PROJECT_TOLERANCE_DEFAULTS.maxWidthRangeMm,
      PROJECT_TOLERANCE_DEFAULTS.maxHeightRangeMm,
    ]
  );
}

export async function listProjects(): Promise<
  Pick<ProjectRow, "projectId" | "name" | "createdAt">[]
> {
  const db = await getDb();
  return await db.getAllAsync("SELECT projectId, name, createdAt FROM projects ORDER BY createdAt DESC");
}

export async function getProject(projectId: string): Promise<ProjectRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    projectId: string;
    name: string;
    createdAt: string;
    defaultMaxOutOfSquareMm: number | null;
    defaultMaxWidthRangeMm: number | null;
    defaultMaxHeightRangeMm: number | null;
  }>(
    `SELECT
      projectId,
      name,
      createdAt,
      COALESCE(defaultMaxOutOfSquareMm, ?) AS defaultMaxOutOfSquareMm,
      COALESCE(defaultMaxWidthRangeMm, ?) AS defaultMaxWidthRangeMm,
      COALESCE(defaultMaxHeightRangeMm, ?) AS defaultMaxHeightRangeMm
    FROM projects
    WHERE projectId = ?`,
    [
      PROJECT_TOLERANCE_DEFAULTS.maxOutOfSquareMm,
      PROJECT_TOLERANCE_DEFAULTS.maxWidthRangeMm,
      PROJECT_TOLERANCE_DEFAULTS.maxHeightRangeMm,
      projectId,
    ]
  );
  return row ?? null;
}
