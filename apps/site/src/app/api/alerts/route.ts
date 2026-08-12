import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedPrincipal } from "@/lib/request-auth"
import { acknowledgeAlert, listAlerts } from "@/lib/operations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  let principal
  try { principal = await authenticatedPrincipal(request) } catch (error) { console.error("alert authentication failed", error) }
  if (!principal) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })
  try {
    return Response.json({ data: await listAlerts(principal) })
  } catch (error) {
    console.error("alert query failed", error)
    return Response.json({ error: { message: "Alerts are not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}

export async function PATCH(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  let principal
  try { principal = await authenticatedPrincipal(request) } catch (error) { console.error("alert authentication failed", error) }
  if (!principal) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })
  const body = await request.json().catch(() => null) as { id?: unknown } | null
  if (!body || typeof body.id !== "string") return Response.json({ error: { message: "Alert id is required.", type: "invalid_request_error" } }, { status: 400 })
  try {
    const acknowledged = await acknowledgeAlert(principal, body.id)
    return acknowledged ? Response.json({ data: { acknowledged: true } }) : Response.json({ error: { message: "Alert not found.", type: "not_found_error" } }, { status: 404 })
  } catch (error) {
    console.error("alert acknowledgement failed", error)
    return Response.json({ error: { message: "Alerts are not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}
