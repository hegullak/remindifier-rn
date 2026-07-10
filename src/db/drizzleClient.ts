import { drizzle, type ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import * as schema from "@/db/schema";

const DB_KEY_PREFIX = "remindifier.db.key.";

const dbKeySecureStoreOpts = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED,
  keychainService: "remindifier-local-db-key",
} as const;

const dbCache = new Map<string, ExpoSQLiteDatabase<typeof schema>>();
const sqliteCache = new Map<string, SQLite.SQLiteDatabase>();

function sanitizeUserId(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

async function getOrCreateDbKey(userId: string): Promise<string> {
  const secureStoreKey = `${DB_KEY_PREFIX}${userId}`;
  const existing = await SecureStore.getItemAsync(secureStoreKey, dbKeySecureStoreOpts);
  if (existing) return existing;

  const created = `${Crypto.randomUUID()}-${Crypto.randomUUID()}`;
  await SecureStore.setItemAsync(secureStoreKey, created, dbKeySecureStoreOpts);
  const verified = await SecureStore.getItemAsync(secureStoreKey, dbKeySecureStoreOpts);
  if (!verified) throw new Error("remindifier: failed to persist database key to secure storage");
  return verified;
}

function escapeSqlLiteral(input: string) {
  return input.replace(/'/g, "''");
}

export async function getDrizzleDbForUser(userId: string) {
  const safeUser = sanitizeUserId(userId);
  const cached = dbCache.get(safeUser);
  if (cached) return cached;

  const sqliteDb = await SQLite.openDatabaseAsync(`remindifier-${safeUser}.db`);
  const key = await getOrCreateDbKey(safeUser);
  if (!key)
    throw new Error("remindifier: database key is empty — refusing to open without encryption");
  await sqliteDb.execAsync(`PRAGMA key='${escapeSqlLiteral(key)}';`);

  const db = drizzle(sqliteDb, { schema });
  dbCache.set(safeUser, db);
  sqliteCache.set(safeUser, sqliteDb);
  return db;
}

export async function getSqliteDbForUser(userId: string) {
  const safeUser = sanitizeUserId(userId);
  const cached = sqliteCache.get(safeUser);
  if (cached) return cached;
  await getDrizzleDbForUser(safeUser);
  const sqliteDb = sqliteCache.get(safeUser);
  if (!sqliteDb) throw new Error("failed to initialize sqlite db");
  return sqliteDb;
}
