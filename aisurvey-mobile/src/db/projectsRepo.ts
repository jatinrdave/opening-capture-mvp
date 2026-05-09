import { getDb } from "./db";

/** Defaults applied to new projects and used when legacy rows lack explicit values. */
export const PROJECT_TOLERANCE_DEFAULTS = {
  maxOutOfSquareMm: 10,
  maxWidthRangeMm: 4,
  maxHeightRangeMm: 4,
  warnBandMultiplier: 1.5,
} as const;

export type ProjectRow = {
  projectId: string;
  name: string;
  createdAt: string;
  siteAddress: string;
  siteNotes: string;
  defaultMaxOutOfSquareMm: number;
  defaultMaxWidthRangeMm: number;
  defaultMaxHeightRangeMm: number;
  defaultWarnBandMultiplier: number;
};

export async function createProject(
  projectId: string,
  name: string,
  extras?: { siteAddress?: string; siteNotes?: string }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO projects (
      projectId, name, createdAt, siteAddress, siteNotes,
      defaultMaxOutOfSquareMm, defaultMaxWidthRangeMm, defaultMaxHeightRangeMm,
      defaultWarnBandMultiplier
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      projectId,
      name,
      new Date().toISOString(),
      extras?.siteAddress?.trim() ?? "",
      extras?.siteNotes?.trim() ?? "",
      PROJECT_TOLERANCE_DEFAULTS.maxOutOfSquareMm,
      PROJECT_TOLERANCE_DEFAULTS.maxWidthRangeMm,
      PROJECT_TOLERANCE_DEFAULTS.maxHeightRangeMm,
      PROJECT_TOLERANCE_DEFAULTS.warnBandMultiplier,
    ]
  );
}

export async function updateProject(
  projectId: string,
  patch: { name?: string; siteAddress?: string; siteNotes?: string }
): Promise<void> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ name: string; siteAddress: string; siteNotes: string }>(
    `SELECT name,
      COALESCE(siteAddress, '') AS siteAddress,
      COALESCE(siteNotes, '') AS siteNotes
    FROM projects WHERE projectId = ?`,
    [projectId]
  );
  if (!row) throw new Error("Project not found");
  const name = patch.name !== undefined ? patch.name.trim() : row.name;
  const siteAddress = patch.siteAddress !== undefined ? patch.siteAddress.trim() : row.siteAddress;
  const siteNotes = patch.siteNotes !== undefined ? patch.siteNotes.trim() : row.siteNotes;
  await db.runAsync(`UPDATE projects SET name = ?, siteAddress = ?, siteNotes = ? WHERE projectId = ?`, [
    name,
    siteAddress,
    siteNotes,
    projectId,
  ]);
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
    siteAddress: string | null;
    siteNotes: string | null;
    defaultMaxOutOfSquareMm: number | null;
    defaultMaxWidthRangeMm: number | null;
    defaultMaxHeightRangeMm: number | null;
    defaultWarnBandMultiplier: number | null;
  }>(
    `SELECT
      projectId,
      name,
      createdAt,
      COALESCE(siteAddress, '') AS siteAddress,
      COALESCE(siteNotes, '') AS siteNotes,
      COALESCE(defaultMaxOutOfSquareMm, ?) AS defaultMaxOutOfSquareMm,
      COALESCE(defaultMaxWidthRangeMm, ?) AS defaultMaxWidthRangeMm,
      COALESCE(defaultMaxHeightRangeMm, ?) AS defaultMaxHeightRangeMm,
      COALESCE(defaultWarnBandMultiplier, ?) AS defaultWarnBandMultiplier
    FROM projects
    WHERE projectId = ?`,
    [
      PROJECT_TOLERANCE_DEFAULTS.maxOutOfSquareMm,
      PROJECT_TOLERANCE_DEFAULTS.maxWidthRangeMm,
      PROJECT_TOLERANCE_DEFAULTS.maxHeightRangeMm,
      PROJECT_TOLERANCE_DEFAULTS.warnBandMultiplier,
      projectId,
    ]
  );
  if (!row) return null;
  return {
    projectId: row.projectId,
    name: row.name,
    createdAt: row.createdAt,
    siteAddress: row.siteAddress ?? "",
    siteNotes: row.siteNotes ?? "",
    defaultMaxOutOfSquareMm: row.defaultMaxOutOfSquareMm ?? PROJECT_TOLERANCE_DEFAULTS.maxOutOfSquareMm,
    defaultMaxWidthRangeMm: row.defaultMaxWidthRangeMm ?? PROJECT_TOLERANCE_DEFAULTS.maxWidthRangeMm,
    defaultMaxHeightRangeMm: row.defaultMaxHeightRangeMm ?? PROJECT_TOLERANCE_DEFAULTS.maxHeightRangeMm,
    defaultWarnBandMultiplier: row.defaultWarnBandMultiplier ?? PROJECT_TOLERANCE_DEFAULTS.warnBandMultiplier,
  };
}
