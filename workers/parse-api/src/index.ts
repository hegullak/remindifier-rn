import { verifyClerkUserId } from "./auth";
import { checkRateLimit } from "./rateLimit";
import { type ParseMode, schemaForMode } from "./schemas";

export interface Env {
  OPENAI_API_KEY: string;
  CLERK_SECRET_KEY: string;
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

function isParseMode(value: unknown): value is ParseMode {
  return value === "event" || value === "intake" || value === "person";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    if (request.method !== "POST" || !url.pathname.endsWith("/api/parse")) {
      return jsonResponse({ error: "not_found" }, 404);
    }

    const userId = await verifyClerkUserId(request, env.CLERK_SECRET_KEY);
    if (!userId) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    if (!checkRateLimit(userId)) {
      return jsonResponse({ error: "rate_limit_exceeded" }, 429);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    const input =
      body && typeof body === "object" && typeof (body as { input?: unknown }).input === "string"
        ? (body as { input: string }).input.trim()
        : "";
    const mode = body && typeof body === "object" ? (body as { mode?: unknown }).mode : undefined;

    if (!input || !isParseMode(mode)) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const { name, schema, system } = schemaForMode(mode);

    let openaiResponse: Response;
    try {
      openaiResponse = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: input },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name, strict: true, schema },
          },
          max_tokens: 768,
        }),
      });
    } catch {
      return jsonResponse({ error: "upstream_error" }, 502);
    }

    const status = openaiResponse.status;
    // Privacy: log userId + mode + status only (no input text)
    console.log(JSON.stringify({ userId, mode, status }));

    const raw = await openaiResponse.text();
    return new Response(raw, {
      status,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  },
};
