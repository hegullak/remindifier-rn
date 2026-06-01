import { verifyToken } from "@clerk/backend";

/** Clerk session JWT from Authorization: Bearer <token> */
export async function verifyClerkUserId(
  request: Request,
  secretKey: string,
): Promise<string | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  try {
    const payload = await verifyToken(token, { secretKey });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
