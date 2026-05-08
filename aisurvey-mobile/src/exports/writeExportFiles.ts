import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import type { CaptureSession } from "../domain/models";
import { buildSessionCsv } from "./csvExport";
import { buildSessionJson } from "./jsonExport";
import { buildSessionPdfHtml } from "./pdfExport";

export type ExportPaths = { pdfPath: string; jsonPath: string; csvPath: string };

export async function writeSessionExports(s: CaptureSession): Promise<ExportPaths> {
  const dir = `${FileSystem.documentDirectory}exports/${s.sessionId}`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

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

