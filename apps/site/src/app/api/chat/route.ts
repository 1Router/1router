import { createHmac } from "node:crypto"
import { NextRequest } from "next/server"
import { authConfigurationError } from "@/lib/auth"
import { authenticatedIdentity } from "@/lib/request-auth"
import { QuotaExceededError, recordUsage, releaseRequest, reserveRequest } from "@/lib/usage"
import { resolveApplicationId } from "@/lib/applications"

const identityHeader = "X-1Router-Identity"
const identitySignatureHeader = "X-1Router-Identity-Signature"
const identityTimestampHeader = "X-1Router-Identity-Timestamp"

function identityAssertion(identity: string, secret: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${identity}`)
    .digest("hex")

  return {
    [identityHeader]: identity,
    [identityTimestampHeader]: timestamp,
    [identitySignatureHeader]: signature,
  }
}

export const runtime = "nodejs"

function upstreamRouterUrl(): string {
  return process.env.ROUTER_API_URL || "https://api.1router.com"
}
const requestWindowMs = 60_000
const defaultRequestsPerMinute = 10

// This in-memory guard remains a temporary fallback. Managed deployments
// should replace it with durable, shared rate limiting in the control plane.
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
  const effectiveLimit = Number.isFinite(limit) && limit > 0 ? limit : defaultRequestsPerMinute

  if (!current || now - current.startedAt >= requestWindowMs) {
    requestCounts.set(address, { startedAt: now, count: 1 })
    return false
  }

  if (current.count >= effectiveLimit) return true
  current.count += 1
  return false
}

function identityAssertionHeaders(identity: string | null, secret: string | undefined): Record<string, string> {
  if (!identity || !secret) return {}
  return identityAssertion(identity, secret)
}

function usageFromSseLine(line: string): { promptTokens: number; completionTokens: number; totalTokens: number } | null {
  if (!line.startsWith("data:") || line.slice(5).trim() === "[DONE]") return null
  try {
    const usage = JSON.parse(line.slice(5).trim()).usage
    if (!usage) return null
    return {
      promptTokens: Number(usage.prompt_tokens || 0),
      completionTokens: Number(usage.completion_tokens || 0),
      totalTokens: Number(usage.total_tokens || 0),
    }
  } catch {
    return null
  }
}

function recordStreamUsage(
  stream: ReadableStream<Uint8Array>,
  identity: string,
  model: string,
  status: number,
  requestId: string | null,
  startedAt: number,
  reservationId: string | null,
  applicationId: string | null,
): ReadableStream<Uint8Array> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
  let finalized = false

  function parseChunk(chunk: Uint8Array) {
    buffer += decoder.decode(chunk, { stream: true })
    let newlineIndex = -1
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      const parsed = usageFromSseLine(line)
      if (parsed) usage = parsed
    }
  }

  async function finalize() {
    if (finalized) return
    finalized = true
    buffer += decoder.decode()
    const parsed = usageFromSseLine(buffer.trim())
    if (parsed) usage = parsed
    try {
      await recordUsage({
        identity,
        model,
        status,
        requestId,
        durationMs: Date.now() - startedAt,
        ...usage,
        streamed: true,
        applicationId,
        reservationId,
      })
    } catch (error) {
      console.error("usage recording failed", error)
      await releaseRequest(reservationId).catch(() => undefined)
    }
  }

  async function release() {
    if (finalized) return
    finalized = true
    await releaseRequest(reservationId).catch(() => undefined)
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await reader.read()
        if (result.done) {
          await finalize()
          controller.close()
          return
        }
        parseChunk(result.value)
        controller.enqueue(result.value)
      } catch (error) {
        await release()
        controller.error(error)
      }
    },
    async cancel() {
      await reader.cancel().catch(() => undefined)
      await release()
    },
  })
}

/**
 * Same-origin proxy for the browser and lightweight OpenAI-compatible clients.
 *
 * Better Auth authenticates the caller, while ROUTER_API_KEY remains a
 * server-only credential used between this Next.js process and the Rust
 * gateway. The generated Better Auth key is never forwarded upstream.
 * When a caller is authenticated, the proxy adds a short-lived HMAC-signed
 * identity assertion so the gateway can attach the caller to future usage,
 * quota, and spend-control work without accessing the auth database.
 */
export async function chatPost(request: NextRequest, requireAuthentication = false) {
  const routerApiKey = process.env.ROUTER_API_KEY
  const routerIdentitySecret = process.env.ROUTER_IDENTITY_SECRET

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

  let identity: string | null = null
  try {
    identity = await authenticatedIdentity(request)
  } catch (error) {
    console.error("chat proxy authentication failed", error)
  }

  const authRequired = requireAuthentication || process.env.AUTH_REQUIRED === "true"
  if (authRequired && identity && !routerIdentitySecret) {
    return Response.json(
      {
        error: {
          message: "Router identity signing is not configured on this server.",
          type: "configuration_error",
        },
      },
      { status: 503 },
    )
  }

  if (authRequired && !identity) {
    return Response.json(
      {
        error: {
          message: "Authentication is required to use this router.",
          type: "authentication_error",
        },
      },
      { status: 401 },
    )
  }

  if (isRateLimited(identity || `ip:${clientAddress(request)}`)) {
    return Response.json(
      {
        error: {
          message: "Chat rate limit reached. Try again shortly.",
          type: "rate_limit_error",
        },
      },
      { status: 429, headers: { "Retry-After": "60" } },
    )
  }

  let reservationId: string | null = null
  let applicationId: string | null = null
  if (identity) {
    const applicationSlug = request.headers.get("x-1router-application")?.trim()
    if (applicationSlug) {
      try {
        applicationId = await resolveApplicationId(identity, applicationSlug)
      } catch (error) {
        console.error("application attribution lookup failed", error)
        return Response.json(
          { error: { message: "Application attribution is unavailable.", type: "configuration_error" } },
          { status: 503 },
        )
      }
      if (!applicationId) {
        return Response.json(
          { error: { message: "The X-1Router-Application value is not registered for this account.", type: "invalid_request_error" } },
          { status: 400 },
        )
      }
    }
    try {
      reservationId = await reserveRequest(identity)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return Response.json(
          {
            error: {
              message: "Daily request quota reached. Try again tomorrow.",
              type: "quota_error",
              limit: error.limit,
              used: error.used,
              reserved: error.reserved,
            },
          },
          { status: 429, headers: { "Retry-After": "3600" } },
        )
      }
      console.error("quota reservation failed", error)
      return Response.json(
        { error: { message: "Quota service is unavailable.", type: "configuration_error" } },
        { status: 503 },
      )
    }
  }

  const startedAt = Date.now()
  const requestBody = await request.clone().json().catch(() => null)
  const model = String(requestBody?.model || "unknown")
  const upstreamBody = requestBody
    ? JSON.stringify(
        requestBody.stream
          ? {
              ...requestBody,
              stream_options: {
                ...(requestBody.stream_options || {}),
                include_usage: true,
              },
            }
          : requestBody,
      )
    : request.body

  try {
    const upstream = await fetch(`${upstreamRouterUrl()}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        Authorization: `Bearer ${routerApiKey}`,
        ...identityAssertionHeaders(identity, routerIdentitySecret),
      },
      body: upstreamBody,
      signal: request.signal,
    })

    const requestId = upstream.headers.get("x-request-id")
    const responseHeaders = new Headers()
    for (const name of ["cache-control", "content-type", "connection", "retry-after", "x-request-id"]) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }

    const streamed = (upstream.headers.get("content-type") || "").includes("text/event-stream")
    if (streamed && identity && upstream.body) {
      return new Response(
        recordStreamUsage(upstream.body, identity, model, upstream.status, requestId, startedAt, reservationId, applicationId),
        {
          status: upstream.status,
          statusText: upstream.statusText,
          headers: responseHeaders,
        },
      )
    }

    if (streamed && identity && !upstream.body) {
      await releaseRequest(reservationId).catch(() => undefined)
    }

    if (!streamed) {
      const body = await upstream.clone().json().catch(() => null)
      const usage = body?.usage
      if (identity) {
        try {
          await recordUsage({
            reservationId,
            identity,
            model,
            status: upstream.status,
            requestId,
            durationMs: Date.now() - startedAt,
            promptTokens: Number(usage?.prompt_tokens || 0),
            completionTokens: Number(usage?.completion_tokens || 0),
            totalTokens: Number(usage?.total_tokens || 0),
            streamed: false,
            applicationId,
          })
        } catch (error) {
          console.error("usage recording failed", error)
          await releaseRequest(reservationId).catch(() => undefined)
        }
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    await releaseRequest(reservationId).catch(() => undefined)
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

export async function POST(request: NextRequest) {
  return chatPost(request)
}
