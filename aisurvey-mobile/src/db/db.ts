import * as SQLite from "expo-sqlite";
import { schemaSql } from "./schema";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("aisurvey.db");
  await db.execAsync(schemaSql);
  return db;
}

