import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedPrincipal } from "@/lib/request-auth"
import { getQuotaStatus, listUsage } from "@/lib/usage"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  if (authConfigurationError) {
    return Response.json(
      {
        error: {
          message: `Authentication is not configured: ${authConfigurationError}`,
          type: "configuration_error",
        },
      },
      { status: 503 },
    )
  }

  let principal
  try {
    principal = await authenticatedPrincipal(request)
  } catch (error) {
    console.error("usage authentication failed", error)
  }

  if (!principal) {
    return Response.json(
      { error: { message: "Authentication is required.", type: "authentication_error" } },
      { status: 401 },
    )
  }

  const rawLimit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "100", 10)
  try {
    const [usage, quota] = await Promise.all([
      listUsage(principal.identity, Number.isFinite(rawLimit) ? rawLimit : 100),
      getQuotaStatus(principal),
    ])
    return Response.json({ data: usage, quota })
  } catch (error) {
    console.error("usage query failed", error)
    return Response.json(
      { error: { message: "Usage is not initialized on this server.", type: "configuration_error" } },
      { status: 503 },
    )
  }
}
