import { logger } from "@/lib/logger";
import type { OpenAIChatCompletion } from "@/lib/parse/openaiTypes";

export type ParseApiMode = "event" | "intake" | "person";

const DEFAULT_TIMEOUT_MS = 5_000;

function parseApiBaseUrl(): string | null {
  const base = process.env.EXPO_PUBLIC_PARSE_API_URL?.trim();
  if (!base) return null;
  return base.replace(/\/$/, "");
}

export async function fetchParseCompletion(
  input: string,
  mode: ParseApiMode,
  getToken: () => Promise<string | null>,
  options?: { timeoutMs?: number },
): Promise<OpenAIChatCompletion | null> {
  const baseUrl = parseApiBaseUrl();
  if (!baseUrl) return null;

  const token = await getToken();
  if (!token) return null;

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/parse`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ input, mode }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn("parse_api_http_error", { mode, status: response.status });
      return null;
    }

    return (await response.json()) as OpenAIChatCompletion;
  } catch (err) {
    logger.warn("parse_api_request_failed", {
      mode,
      error: err instanceof Error ? err.name : "unknown",
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
