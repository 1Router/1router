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
  reservationId?: string | null
}

export interface QuotaStatus {
  limit: number
  used: number
  reserved: number
  remaining: number | null
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
         completion_tokens, total_tokens, streamed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
            prompt_tokens, completion_tokens, total_tokens, streamed, created_at
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
    createdAt: row.created_at.toISOString(),
  }))
}
