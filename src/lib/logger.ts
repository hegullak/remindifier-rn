import * as FileSystem from "expo-file-system/legacy";
import { logger as createLogger, type transportFunctionType } from "react-native-logs";

const LOG_DIR = `${FileSystem.documentDirectory ?? ""}logs/`;
const APP_LOG = `${LOG_DIR}app.log`;
const ERROR_LOG = `${LOG_DIR}error.log`;
const MAX_BYTES = 500 * 1024;

async function ensureLogDir() {
  if (!FileSystem.documentDirectory) return;
  const info = await FileSystem.getInfoAsync(LOG_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOG_DIR, { intermediates: true });
  }
}

async function appendToFile(path: string, line: string) {
  if (!FileSystem.documentDirectory) return;
  await ensureLogDir();
  const info = await FileSystem.getInfoAsync(path);
  const size = "size" in info && typeof info.size === "number" ? info.size : 0;
  if (info.exists && size > MAX_BYTES) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
  const existing = info.exists ? await FileSystem.readAsStringAsync(path) : "";
  await FileSystem.writeAsStringAsync(path, `${existing}${line}\n`);
}

function formatLine(level: string, msg: string, meta?: Record<string, unknown>): string {
  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] [${level.toUpperCase()}] ${msg}${metaStr}`;
}

function formatFromMsgs(level: string, msgs: unknown[]): string {
  const operation = typeof msgs[0] === "string" ? msgs[0] : String(msgs[0]);
  const meta =
    msgs[1] && typeof msgs[1] === "object" && !Array.isArray(msgs[1])
      ? (msgs[1] as Record<string, unknown>)
      : undefined;
  return formatLine(level, operation, meta);
}

const fileTransport: transportFunctionType<object> = (props) => {
  const line = props.msg;
  const level = props.level.text;
  void (async () => {
    try {
      if (level === "error" || level === "warn") {
        await appendToFile(ERROR_LOG, line);
      }
      await appendToFile(APP_LOG, line);
    } catch {
      // Avoid recursive logging failures.
    }
  })();
};

const consoleTransportDev: transportFunctionType<object> = (props) => {
  console.log(props.msg);
};

const config = {
  levels: { debug: 0, info: 1, warn: 2, error: 3 },
  severity: __DEV__ ? "debug" : "info",
  transport: __DEV__ ? [fileTransport, consoleTransportDev] : fileTransport,
  transportOptions: {},
  async: true,
  formatFunc: (level: string, _extension: string | null, msgs: unknown[]) =>
    formatFromMsgs(level, msgs),
};

export const logger = createLogger.createLogger(config);
export { APP_LOG, ERROR_LOG, LOG_DIR };
