import { getDb } from "./db";

export async function createOpening(openingId: string, projectId: string, label: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO openings (openingId, projectId, label, createdAt) VALUES (?, ?, ?, ?)", [
    openingId,
    projectId,
    label,
    new Date().toISOString(),
  ]);
}

export async function listOpenings(projectId: string): Promise<{ openingId: string; label: string; createdAt: string }[]> {
  const db = await getDb();
  return await db.getAllAsync("SELECT openingId, label, createdAt FROM openings WHERE projectId = ? ORDER BY createdAt DESC", [
    projectId,
  ]);
}

export async function getOpening(openingId: string): Promise<{
  openingId: string;
  projectId: string;
  label: string;
  createdAt: string;
} | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    openingId: string;
    projectId: string;
    label: string;
    createdAt: string;
  }>("SELECT openingId, projectId, label, createdAt FROM openings WHERE openingId = ?", [openingId]);
  return row ?? null;
}

