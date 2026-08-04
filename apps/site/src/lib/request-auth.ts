import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export function bearerToken(request: NextRequest): string | null {
  const value = request.headers.get("authorization")
  if (!value?.startsWith("Bearer ")) return null
  const token = value.slice("Bearer ".length).trim()
  return token || null
}

/**
 * Resolve the stable identity used by the control-plane ledger. The Better Auth
 * API key itself never leaves this process.
 */
export async function authenticatedIdentity(request: NextRequest): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (session?.user.id) return `user:${session.user.id}`

  const token = bearerToken(request)
  if (!token) return null

  const verified = await auth.api.verifyApiKey({ body: { key: token } })
  if (verified.valid && verified.key?.referenceId) return `user:${verified.key.referenceId}`
  return null
}
