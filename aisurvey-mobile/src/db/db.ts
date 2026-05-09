import * as SQLite from "expo-sqlite";
import { runAllMigrations } from "./migrations";
import { schemaSql } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  if (!dbPromise) {
    dbPromise = (async () => {
      const opened = await SQLite.openDatabaseAsync("aisurvey.db");
      await opened.execAsync(schemaSql);
      await runAllMigrations(opened);
      db = opened;
      return opened;
    })();
  }
  return await dbPromise;
}

