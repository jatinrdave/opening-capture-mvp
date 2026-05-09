import { getDb } from "./db";

export type OpeningRow = {
  openingId: string;
  projectId: string;
  label: string;
  createdAt: string;
  locationNotes: string;
  openingType: string;
  overrideMaxOutOfSquareMm: number | null;
  overrideMaxWidthRangeMm: number | null;
  overrideMaxHeightRangeMm: number | null;
};

export async function createOpening(
  openingId: string,
  projectId: string,
  label: string,
  extras?: { locationNotes?: string; openingType?: string }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO openings (openingId, projectId, label, createdAt, locationNotes, openingType)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      openingId,
      projectId,
      label,
      new Date().toISOString(),
      extras?.locationNotes?.trim() ?? "",
      extras?.openingType?.trim() ?? "",
    ]
  );
}

export type OpeningListRow = Pick<OpeningRow, "openingId" | "label" | "createdAt" | "locationNotes" | "openingType"> & {
  /** Latest session overallStatus for this opening, or null if no sessions. */
  latestSessionStatus: string | null;
};

export async function listOpenings(projectId: string): Promise<OpeningListRow[]> {
  const db = await getDb();
  return await db.getAllAsync<OpeningListRow>(
    `SELECT
      o.openingId,
      o.label,
      o.createdAt,
      COALESCE(o.locationNotes, '') AS locationNotes,
      COALESCE(o.openingType, '') AS openingType,
      (
        SELECT s.overallStatus FROM sessions s
        WHERE s.openingId = o.openingId
        ORDER BY s.createdAt DESC
        LIMIT 1
      ) AS latestSessionStatus
    FROM openings o
    WHERE o.projectId = ?
    ORDER BY o.createdAt DESC`,
    [projectId]
  );
}

export async function updateOpening(
  openingId: string,
  patch: { label: string; locationNotes: string; openingType: string }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE openings SET label = ?, locationNotes = ?, openingType = ? WHERE openingId = ?`, [
    patch.label.trim(),
    patch.locationNotes.trim(),
    patch.openingType.trim(),
    openingId,
  ]);
}

export async function getOpening(openingId: string): Promise<OpeningRow | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<OpeningRow>(
    `SELECT openingId, projectId, label, createdAt,
      COALESCE(locationNotes, '') AS locationNotes,
      COALESCE(openingType, '') AS openingType,
      overrideMaxOutOfSquareMm,
      overrideMaxWidthRangeMm,
      overrideMaxHeightRangeMm
    FROM openings WHERE openingId = ?`,
    [openingId]
  );
  return row ?? null;
}

export async function updateOpeningToleranceOverrides(
  openingId: string,
  overrides: {
    overrideMaxOutOfSquareMm: number | null;
    overrideMaxWidthRangeMm: number | null;
    overrideMaxHeightRangeMm: number | null;
  }
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE openings SET
      overrideMaxOutOfSquareMm = ?,
      overrideMaxWidthRangeMm = ?,
      overrideMaxHeightRangeMm = ?
    WHERE openingId = ?`,
    [
      overrides.overrideMaxOutOfSquareMm,
      overrides.overrideMaxWidthRangeMm,
      overrides.overrideMaxHeightRangeMm,
      openingId,
    ]
  );
}
