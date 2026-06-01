# remindifier parse API (Cloudflare Worker)

Proxies OpenAI structured parsing for the mobile app. The OpenAI API key stays on the worker; clients send a Clerk session JWT.

## Endpoints

- `POST /api/parse`
- Body: `{ "input": string, "mode": "event" | "intake" | "person" }`
- Header: `Authorization: Bearer <clerk-session-jwt>`
- Response: raw OpenAI `/v1/chat/completions` JSON

## Secrets

```bash
cd workers/parse-api
wrangler secret put OPENAI_API_KEY
wrangler secret put CLERK_SECRET_KEY
```

## Dev

```bash
npm install
npm run dev
```

Set `EXPO_PUBLIC_PARSE_API_URL=http://127.0.0.1:8787` in the app's `.env.local`.

## Deploy

```bash
npm run deploy
```

Rate limit: 30 requests per minute per Clerk user (in-isolate).
