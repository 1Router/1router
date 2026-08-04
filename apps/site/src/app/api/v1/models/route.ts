import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedIdentity } from "@/lib/request-auth"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  if (authConfigurationError) {
    return Response.json(
      { error: { message: `Authentication is not configured: ${authConfigurationError}`, type: "configuration_error" } },
      { status: 503 },
    )
  }

  try {
    const identity = await authenticatedIdentity(request)
    if (!identity) {
      return Response.json(
        { error: { message: "Authentication is required.", type: "authentication_error" } },
        { status: 401 },
      )
    }

    const routerApiKey = process.env.ROUTER_API_KEY
    if (!routerApiKey) {
      return Response.json(
        { error: { message: "Chat is not configured on this server.", type: "configuration_error" } },
        { status: 503 },
      )
    }

    const upstreamUrl = process.env.ROUTER_API_URL || "http://localhost:3001"
    const upstream = await fetch(`${upstreamUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${routerApiKey}` },
      cache: "no-store",
    })
    const body = await upstream.text()
    return new Response(body, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json" },
    })
  } catch (error) {
    console.error("model list proxy failed", error)
    return Response.json(
      { error: { message: "Unable to reach the router API.", type: "upstream_error" } },
      { status: 502 },
    )
  }
}
