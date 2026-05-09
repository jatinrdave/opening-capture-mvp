import * as FileSystem from "expo-file-system/legacy";

const FILENAME = "operator_profile.json";

type Stored = { operatorUserId: string };

function profilePath(): string | null {
  const base = FileSystem.documentDirectory;
  if (!base) return null;
  return `${base}${FILENAME}`;
}

/** Device-local operator identity (MVP stand-in for signed-in user). Not multi-user secure auth. */
export async function loadOperatorUserId(): Promise<string> {
  const path = profilePath();
  if (!path) return "";
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return "";
    const raw = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 });
    const parsed = JSON.parse(raw) as Stored;
    return typeof parsed.operatorUserId === "string" ? parsed.operatorUserId.trim() : "";
  } catch {
    return "";
  }
}

export async function saveOperatorUserId(operatorUserId: string): Promise<void> {
  const path = profilePath();
  if (!path) throw new Error("Document directory unavailable.");
  const trimmed = operatorUserId.trim();
  const payload: Stored = { operatorUserId: trimmed };
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload), {
    encoding: FileSystem.EncodingType.UTF8,
  });
}
