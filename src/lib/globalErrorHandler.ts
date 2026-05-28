import { logger } from "@/lib/logger";

type ErrorUtilsLike = {
  getGlobalHandler: () => (error: Error, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

function getErrorUtils(): ErrorUtilsLike | null {
  const g = globalThis as typeof globalThis & { ErrorUtils?: ErrorUtilsLike };
  const utils = g.ErrorUtils;
  if (!utils?.getGlobalHandler || !utils?.setGlobalHandler) return null;
  return utils;
}

/** RN exposes ErrorUtils on globalThis, not as a react-native export in newer versions. */
export function installGlobalErrorLogger(): void {
  const errorUtils = getErrorUtils();
  if (!errorUtils) return;

  const defaultHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    logger.error("unhandled_js_error", { code: error.name, fatal: Boolean(isFatal) });
    defaultHandler?.(error, isFatal);
  });
}
