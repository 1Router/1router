import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedPrincipal } from "@/lib/request-auth"
import { getBillingSummary } from "@/lib/usage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (authConfigurationError) return Response.json({ error: { message: authConfigurationError, type: "configuration_error" } }, { status: 503 })
  let principal
  try { principal = await authenticatedPrincipal(request) } catch (error) { console.error("billing authentication failed", error) }
  if (!principal) return Response.json({ error: { message: "Authentication is required.", type: "authentication_error" } }, { status: 401 })
  try {
    return Response.json({ data: await getBillingSummary(principal), stripePortal: process.env.DEPLOYMENT_MODE === "managed" })
  } catch (error) {
    console.error("billing summary failed", error)
    return Response.json({ error: { message: "Billing usage is not initialized on this server.", type: "configuration_error" } }, { status: 503 })
  }
}
