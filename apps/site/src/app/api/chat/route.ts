import { NextRequest } from "next/server"

export const runtime = "edge"

const upstreamUrl = process.env.ROUTER_API_URL || "http://localhost:3001"
const requestWindowMs = 60_000
const defaultRequestsPerMinute = 10

// This is intentionally only a temporary anonymous guard. The durable version
// belongs in the future account/API-key/quota layer and should use shared state
// across site instances.
const requestCounts = new Map<string, { startedAt: number; count: number }>()

function clientAddress(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    "anonymous"
  )
}

function isRateLimited(address: string): boolean {
  const limit = Number.parseInt(
    process.env.CHAT_RATE_LIMIT_PER_MINUTE || String(defaultRequestsPerMinute),
    10,
  )
  const now = Date.now()
  const current = requestCounts.get(address)

  if (!current || now - current.startedAt >= requestWindowMs) {
    requestCounts.set(address, { startedAt: now, count: 1 })
    return false
  }

  if (current.count >= (Number.isFinite(limit) && limit > 0 ? limit : defaultRequestsPerMinute)) {
    return true
  }

  current.count += 1
  return false
}

/**
 * Same-origin proxy for the browser chat.
 *
 * The router key is read only on the server and is never included in the
 * client bundle. Returning the upstream response directly preserves the SSE
 * stream instead of buffering it in the Next.js route.
 */
export async function POST(request: NextRequest) {
  const routerApiKey = process.env.ROUTER_API_KEY

  if (!routerApiKey) {
    return Response.json(
      {
        error: {
          message: "Chat is not configured on this server.",
          type: "configuration_error",
        },
      },
      { status: 503 },
    )
  }

  if (isRateLimited(clientAddress(request))) {
    return Response.json(
      {
        error: {
          message: "Anonymous chat rate limit reached. Try again shortly.",
          type: "rate_limit_error",
        },
      },
      { status: 429, headers: { "Retry-After": "60" } },
    )
  }

  try {
    const upstream = await fetch(`${upstreamUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        Authorization: `Bearer ${routerApiKey}`,
      },
      body: request.body,
      // Cancel the upstream generation when the browser disconnects.
      signal: request.signal,
    })

    const headers = new Headers()
    for (const name of ["cache-control", "content-type", "connection", "retry-after"]) {
      const value = upstream.headers.get(name)
      if (value) headers.set(name, value)
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    })
  } catch (error) {
    console.error("chat proxy upstream request failed", error)

    return Response.json(
      {
        error: {
          message: "Unable to reach the router API.",
          type: "upstream_error",
        },
      },
      { status: 502 },
    )
  }
}
