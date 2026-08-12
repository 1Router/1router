import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedPrincipal } from "@/lib/request-auth"
import { listInvoices } from "@/lib/operations"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  let principal
  try { principal = await authenticatedPrincipal(request) } catch (error) { console.error("invoice authentication failed", error) }
  if (!principal) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })
  try {
    return Response.json({ data: await listInvoices(principal) })
  } catch (error) {
    console.error("invoice query failed", error)
    return Response.json({ error: { message: "Invoices are temporarily unavailable.", type: "upstream_error" } }, { status: 502 })
  }
}
