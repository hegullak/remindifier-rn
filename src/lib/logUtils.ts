import * as FileSystem from "expo-file-system/legacy";
import { APP_LOG, ERROR_LOG } from "./logger";

export async function readLogFiles(): Promise<{ app: string; error: string }> {
  const read = async (path: string) => {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return "";
    return await FileSystem.readAsStringAsync(path);
  };
  return { app: await read(APP_LOG), error: await read(ERROR_LOG) };
}

export async function clearLogFiles(): Promise<void> {
  await FileSystem.deleteAsync(APP_LOG, { idempotent: true });
  await FileSystem.deleteAsync(ERROR_LOG, { idempotent: true });
}

export async function getLastErrorTimestamp(): Promise<string | null> {
  const info = await FileSystem.getInfoAsync(ERROR_LOG);
  if (!info.exists) return null;
  const content = await FileSystem.readAsStringAsync(ERROR_LOG);
  const lines = content.trim().split("\n").filter(Boolean);
  if (!lines.length) return null;
  const last = lines[lines.length - 1];
  const match = last.match(/\[(.+?)\]/);
  return match ? match[1] : null;
}
