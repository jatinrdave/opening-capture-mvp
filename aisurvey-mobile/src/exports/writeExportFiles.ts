import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import type { CaptureSession } from "../domain/models";
import { buildSessionCsv } from "./csvExport";
import { buildSessionJson } from "./jsonExport";
import { buildSessionPdfHtml } from "./pdfExport";

export type ExportPaths = { pdfPath: string; jsonPath: string; csvPath: string };

async function ensureDir(dir: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function writeSessionExports(s: CaptureSession): Promise<ExportPaths> {
  const base = FileSystem.documentDirectory;
  if (!base) {
    throw new Error("FileSystem.documentDirectory is unavailable on this platform.");
  }

  const dir = `${base}exports/${s.sessionId}`;
  await ensureDir(dir);

  const jsonPath = `${dir}/session.json`;
  const csvPath = `${dir}/session.csv`;
  await FileSystem.writeAsStringAsync(jsonPath, buildSessionJson(s), { encoding: FileSystem.EncodingType.UTF8 });
  await FileSystem.writeAsStringAsync(csvPath, buildSessionCsv(s), { encoding: FileSystem.EncodingType.UTF8 });

  const { uri: pdfPath } = await Print.printToFileAsync({
    html: buildSessionPdfHtml(s),
    base64: false,
  });

  // Copy into session export directory for consistent sharing location
  const pdfCopyPath = `${dir}/report.pdf`;
  await FileSystem.copyAsync({ from: pdfPath, to: pdfCopyPath });

  return { pdfPath: pdfCopyPath, jsonPath, csvPath };
}

