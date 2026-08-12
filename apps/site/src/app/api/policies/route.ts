import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedPrincipal } from "@/lib/request-auth"
import { getPolicies, upsertPolicy } from "@/lib/policies"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function principalFor(request: NextRequest) {
  if (authConfigurationError) return null
  try {
    return await authenticatedPrincipal(request)
  } catch (error) {
    console.error("policy authentication failed", error)
    return null
  }
}

export async function GET(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  const principal = await principalFor(request)
  if (!principal) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })
  try {
    return Response.json({ data: await getPolicies(principal.scopes), scopes: principal.scopes })
  } catch (error) {
    console.error("policy query failed", error)
    return Response.json({ error: { message: "Policies are not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  const principal = await principalFor(request)
  if (!principal) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || !["user", "api_key", "organization"].includes(String(body.scopeType)) || typeof body.scopeId !== "string") {
    return Response.json({ error: { message: "scopeType and scopeId are required.", type: "invalid_request_error" } }, { status: 400 })
  }

  try {
    const policy = await upsertPolicy(principal, {
      scopeType: body.scopeType as "user" | "api_key" | "organization",
      scopeId: body.scopeId,
      requestsPerDay: body.requestsPerDay as number | null | undefined,
      requestsPerMinute: body.requestsPerMinute as number | null | undefined,
      tokensPerMonth: body.tokensPerMonth as number | null | undefined,
      spendLimitCentsPerMonth: body.spendLimitCentsPerMonth as number | null | undefined,
      alertThresholdPercent: body.alertThresholdPercent as number | undefined,
    })
    return Response.json({ data: policy })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save policy."
    if (message.includes("permission") || message.includes("must be")) return Response.json({ error: { message, type: "invalid_request_error" } }, { status: 400 })
    console.error("policy update failed", error)
    return Response.json({ error: { message: "Policies are not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}
