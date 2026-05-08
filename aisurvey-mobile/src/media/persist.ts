import * as FileSystem from "expo-file-system";

export async function ensureDir(dirUri: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(dirUri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  }
}

export async function copyIntoAppStorage(fromUri: string, toDir: string, filename: string): Promise<string> {
  await ensureDir(toDir);
  const toUri = `${toDir}/${filename}`;
  await FileSystem.copyAsync({ from: fromUri, to: toUri });
  return toUri;
}
