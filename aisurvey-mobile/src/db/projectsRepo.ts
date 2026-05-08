import { getDb } from "./db";

export async function createProject(projectId: string, name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("INSERT INTO projects (projectId, name, createdAt) VALUES (?, ?, ?)", [
    projectId,
    name,
    new Date().toISOString(),
  ]);
}

export async function listProjects(): Promise<{ projectId: string; name: string; createdAt: string }[]> {
  const db = await getDb();
  return await db.getAllAsync("SELECT projectId, name, createdAt FROM projects ORDER BY createdAt DESC");
}

