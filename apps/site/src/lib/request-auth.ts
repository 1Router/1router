import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { database } from "@/lib/database"

export type PrincipalScopeType = "user" | "api_key" | "organization"

export interface PrincipalScope {
  type: PrincipalScopeType
  id: string
}

export interface AuthenticatedPrincipal {
  userId: string
  identity: string
  keyId: string | null
  organizationId: string | null
  scopes: PrincipalScope[]
}

export function bearerToken(request: NextRequest): string | null {
  const value = request.headers.get("authorization")
  if (!value?.startsWith("Bearer ")) return null
  const token = value.slice("Bearer ".length).trim()
  return token || null
}

async function organizationForRequest(userId: string, request: NextRequest): Promise<string | null> {
  const organizationId = request.headers.get("x-1router-organization")?.trim()
  if (!organizationId) return null

  const member = await database.query(
    `SELECT 1
       FROM member
      WHERE "userId" = $1 AND "organizationId" = $2
      LIMIT 1`,
    [userId, organizationId],
  )
  return member.rowCount ? organizationId : null
}

/**
 * Resolve the authenticated caller and the scopes that may be charged or
 * limited. API keys are still never forwarded to the Rust gateway. An
 * organization scope is accepted only when the authenticated user is a
 * Better Auth member of that organization.
 */
export async function authenticatedPrincipal(request: NextRequest): Promise<AuthenticatedPrincipal | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  let userId = session?.user.id || null
  let keyId: string | null = null

  if (!userId) {
    const token = bearerToken(request)
    if (!token) return null

    const verified = await auth.api.verifyApiKey({ body: { key: token } })
    if (!verified.valid || !verified.key?.referenceId) return null
    userId = verified.key.referenceId
    keyId = typeof verified.key.id === "string" ? verified.key.id : null
  }

  const organizationId = await organizationForRequest(userId, request)
  const scopes: PrincipalScope[] = [{ type: "user", id: userId }]
  if (keyId) scopes.push({ type: "api_key", id: keyId })
  if (organizationId) scopes.push({ type: "organization", id: organizationId })

  return {
    userId,
    identity: `user:${userId}`,
    keyId,
    organizationId,
    scopes,
  }
}

/** Backwards-compatible identity helper for non-enforcement routes. */
export async function authenticatedIdentity(request: NextRequest): Promise<string | null> {
  return (await authenticatedPrincipal(request))?.identity || null
}
