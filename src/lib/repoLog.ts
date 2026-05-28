import { logger } from "@/lib/logger";

/** Log repo failures with IDs and error codes only — never user content. */
export function logRepoError(
  operation: string,
  err: unknown,
  meta?: Record<string, unknown>,
): never {
  logger.error(operation, {
    ...meta,
    code: err instanceof Error ? err.name : "unknown_error",
  });
  throw err;
}
