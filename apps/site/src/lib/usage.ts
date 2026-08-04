import { database } from "@/lib/database"

const reservationLifetimeMs = 10 * 60 * 1000

export interface UsageRecord {
  identity: string
  model: string
  status: number
  requestId: string | null
  durationMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  streamed: boolean
  applicationId?: string | null
  reservationId?: string | null
}

export interface QuotaStatus {
  limit: number
  used: number
  reserved: number
  remaining: number | null
}

export interface PublicRanking {
  modelId: string
  tokens: {
    "24h": number
    "7d": number
    "30d": number
    all: number
  }
  change: {
    "24h": number | null
    "7d": number | null
    "30d": number | null
    all: null
  }
  requests: {
    "24h": number
    "7d": number
    "30d": number
    all: number
  }
}

function configuredDailyLimit(): number {
  const value = Number.parseInt(process.env.ROUTER_REQUESTS_PER_DAY || "0", 10)
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function safeCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value)
  return Number.isSafeInteger(count) && count >= 0 ? count : 0
}

function safeText(value: string, maxLength: number): string {
  return value.slice(0, maxLength)
}

/**
 * Atomically reserve one request for the current UTC day. The advisory lock
 * only lives for this short transaction; it is never held during an upstream
 * request or stream.
 */
export async function reserveRequest(identity: string): Promise<string | null> {
  const limit = configuredDailyLimit()
  if (limit === 0) return null

  const client = await database.connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [identity])
    await client.query("DELETE FROM router_quota_reservations WHERE expires_at <= now()")

    const result = await client.query<{ used: string; reserved: string }>(
      `SELECT
         (SELECT count(*) FROM router_usage
           WHERE identity = $1
             AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))::text AS used,
         (SELECT count(*) FROM router_quota_reservations
           WHERE identity = $1
             AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
             AND expires_at > now())::text AS reserved`,
      [identity],
    )
    const used = Number(result.rows[0]?.used || 0)
    const reserved = Number(result.rows[0]?.reserved || 0)

    if (used + reserved >= limit) {
      await client.query("ROLLBACK")
      throw new QuotaExceededError(limit, used, reserved)
    }

    const reservation = await client.query<{ id: string }>(
      `INSERT INTO router_quota_reservations (identity, expires_at)
       VALUES ($1, now() + ($2 * interval '1 millisecond'))
       RETURNING id::text`,
      [identity, reservationLifetimeMs],
    )
    await client.query("COMMIT")
    return reservation.rows[0]?.id || null
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export class QuotaExceededError extends Error {
  readonly limit: number
  readonly used: number
  readonly reserved: number

  constructor(limit: number, used: number, reserved: number) {
    super("Daily request quota reached.")
    this.name = "QuotaExceededError"
    this.limit = limit
    this.used = used
    this.reserved = reserved
  }
}

export async function releaseRequest(reservationId: string | null | undefined): Promise<void> {
  if (!reservationId) return
  await database.query("DELETE FROM router_quota_reservations WHERE id = $1::uuid", [reservationId])
}

export async function recordUsage(record: UsageRecord): Promise<void> {
  const client = await database.connect()
  try {
    await client.query("BEGIN")
    if (record.reservationId) {
      await client.query("DELETE FROM router_quota_reservations WHERE id = $1::uuid", [record.reservationId])
    }
    await client.query(
      `INSERT INTO router_usage
        (identity, model, status, request_id, duration_ms, prompt_tokens,
         completion_tokens, total_tokens, streamed, application_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        safeText(record.identity, 255),
        safeText(record.model, 255),
        Number.isInteger(record.status) && record.status >= 100 && record.status <= 599 ? record.status : 500,
        record.requestId ? safeText(record.requestId, 255) : null,
        Number.isSafeInteger(record.durationMs) && record.durationMs >= 0 ? record.durationMs : 0,
        safeCount(record.promptTokens),
        safeCount(record.completionTokens),
        safeCount(record.totalTokens),
        record.streamed,
        record.applicationId || null,
      ],
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Aggregate only successful, authenticated proxy requests. This deliberately
 * returns model-level totals and never exposes identities, prompts, or raw
 * request rows to the public rankings page.
 */
export async function getPublicRankings(limit = 50): Promise<PublicRanking[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const result = await database.query<{
    model: string
    tokens_24h: string
    tokens_7d: string
    tokens_30d: string
    tokens_all: string
    previous_tokens_24h: string
    previous_tokens_7d: string
    previous_tokens_30d: string
    requests_24h: string
    requests_7d: string
    requests_30d: string
    requests_all: string
  }>(
    `SELECT
       model,
       COALESCE(SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '24 hours'), 0)::text AS tokens_24h,
       COALESCE(SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '7 days'), 0)::text AS tokens_7d,
       COALESCE(SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '30 days'), 0)::text AS tokens_30d,
       COALESCE(SUM(total_tokens), 0)::text AS tokens_all,
       COALESCE(SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '48 hours' AND created_at < now() - interval '24 hours'), 0)::text AS previous_tokens_24h,
       COALESCE(SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '14 days' AND created_at < now() - interval '7 days'), 0)::text AS previous_tokens_7d,
       COALESCE(SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'), 0)::text AS previous_tokens_30d,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours')::text AS requests_24h,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days')::text AS requests_7d,
       COUNT(*) FILTER (WHERE created_at >= now() - interval '30 days')::text AS requests_30d,
       COUNT(*)::text AS requests_all
     FROM router_usage
     WHERE status >= 200 AND status < 300
     GROUP BY model
     HAVING COUNT(*) > 0
     ORDER BY SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '30 days') DESC, COUNT(*) DESC, model ASC
     LIMIT $1`,
    [boundedLimit],
  )

  const parse = (value: string): number => {
    const number = Number(value)
    return Number.isSafeInteger(number) && number >= 0 ? number : 0
  }
  const change = (current: number, previous: number): number | null => {
    if (previous === 0) return null
    return Number((((current - previous) / previous) * 100).toFixed(1))
  }

  return result.rows.map((row) => {
    const tokens24h = parse(row.tokens_24h)
    const tokens7d = parse(row.tokens_7d)
    const tokens30d = parse(row.tokens_30d)
    return {
      modelId: row.model,
      tokens: { "24h": tokens24h, "7d": tokens7d, "30d": tokens30d, all: parse(row.tokens_all) },
      change: {
        "24h": change(tokens24h, parse(row.previous_tokens_24h)),
        "7d": change(tokens7d, parse(row.previous_tokens_7d)),
        "30d": change(tokens30d, parse(row.previous_tokens_30d)),
        all: null,
      },
      requests: {
        "24h": parse(row.requests_24h),
        "7d": parse(row.requests_7d),
        "30d": parse(row.requests_30d),
        all: parse(row.requests_all),
      },
    }
  })
}

export async function getQuotaStatus(identity: string): Promise<QuotaStatus> {
  const limit = configuredDailyLimit()
  if (limit === 0) return { limit: 0, used: 0, reserved: 0, remaining: null }

  const result = await database.query<{ used: string; reserved: string }>(
    `SELECT
       (SELECT count(*) FROM router_usage
         WHERE identity = $1
           AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))::text AS used,
       (SELECT count(*) FROM router_quota_reservations
         WHERE identity = $1
           AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
           AND expires_at > now())::text AS reserved`,
    [identity],
  )
  const used = Number(result.rows[0]?.used || 0)
  const reserved = Number(result.rows[0]?.reserved || 0)
  return {
    limit,
    used,
    reserved,
    remaining: Math.max(limit - used - reserved, 0),
  }
}

export async function listUsage(identity: string, limit = 100): Promise<Array<UsageRecord & { id: string; createdAt: string }>> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const result = await database.query(
    `SELECT id, identity, model, status, request_id, duration_ms,
            prompt_tokens, completion_tokens, total_tokens, streamed, application_id, created_at
       FROM router_usage
      WHERE identity = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [identity, boundedLimit],
  )

  return result.rows.map((row) => ({
    id: row.id,
    identity: row.identity,
    model: row.model,
    status: row.status,
    requestId: row.request_id,
    durationMs: row.duration_ms,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    streamed: row.streamed,
    applicationId: row.application_id,
    createdAt: row.created_at.toISOString(),
  }))
}
