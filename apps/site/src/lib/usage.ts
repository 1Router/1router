import { createHash } from "node:crypto"
import { database } from "@/lib/database"
import { effectivePolicies } from "@/lib/policies"
import type { AuthenticatedPrincipal, PrincipalScope } from "@/lib/request-auth"

const reservationLifetimeMs = 10 * 60 * 1000

export interface UsageRecord {
  identity: string
  userId: string
  apiKeyId?: string | null
  organizationId?: string | null
  model: string
  status: number
  requestId: string | null
  durationMs: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costMicrodollars?: number
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
  tokens: { "24h": number; "7d": number; "30d": number; all: number }
  change: { "24h": number | null; "7d": number | null; "30d": number | null; all: null }
  requests: { "24h": number; "7d": number; "30d": number; all: number }
}

export interface BillingSummary {
  periodStart: string
  periodEnd: string
  requests: number
  totalTokens: number
  spendCents: number
  byModel: Array<{ model: string; requests: number; tokens: number; spendCents: number }>
}

function safeCount(value: unknown): number {
  const count = typeof value === "number" ? value : Number(value)
  return Number.isSafeInteger(count) && count >= 0 ? count : 0
}

function safeText(value: string, maxLength: number): string {
  return value.slice(0, maxLength)
}

function scopeColumn(scopeType: PrincipalScope["type"]): string {
  if (scopeType === "user") return "user_id"
  if (scopeType === "api_key") return "api_key_id"
  return "organization_id"
}

function scopeLabel(scope: PrincipalScope): string {
  return `${scope.type}:${scope.id}`
}

function periodStartUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

function currentMinute(): Date {
  const now = Date.now()
  return new Date(Math.floor(now / 60_000) * 60_000)
}

type Queryable = { query: (text: string, values?: readonly unknown[]) => Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }> }

async function scopedTotals(client: Queryable, scope: PrincipalScope) {
  const column = scopeColumn(scope.type)
  const result = await client.query(
    `SELECT
       (SELECT count(*) FROM router_usage WHERE ${column} = $1
         AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'))::text AS used_today,
       (SELECT count(*) FROM router_quota_reservations WHERE ${column} = $1
         AND created_at >= (date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
         AND expires_at > now())::text AS reserved_today,
       (SELECT COALESCE(sum(total_tokens), 0) FROM router_usage WHERE ${column} = $1
         AND created_at >= date_trunc('month', now()))::text AS tokens_month,
       (SELECT COALESCE(sum(estimated_tokens), 0) FROM router_quota_reservations WHERE ${column} = $1
         AND created_at >= date_trunc('month', now()) AND expires_at > now())::text AS reserved_tokens_month,
       (SELECT COALESCE(sum(cost_microdollars), 0) FROM router_usage WHERE ${column} = $1
         AND created_at >= date_trunc('month', now()))::text AS spend_month,
       (SELECT COALESCE(sum(estimated_cost_microdollars), 0) FROM router_quota_reservations WHERE ${column} = $1
         AND created_at >= date_trunc('month', now()) AND expires_at > now())::text AS reserved_spend_month`,
    [scope.id],
  )
  const row = result.rows[0] || {}
  return {
    usedToday: safeCount(row.used_today),
    reservedToday: safeCount(row.reserved_today),
    tokensMonth: safeCount(row.tokens_month),
    reservedTokensMonth: safeCount(row.reserved_tokens_month),
    spendMonth: safeCount(row.spend_month),
    reservedSpendMonth: safeCount(row.reserved_spend_month),
  }
}

async function modelPrice(model: string): Promise<{ input: number; output: number }> {
  const fallbackInput = safeCount(process.env.ROUTER_DEFAULT_INPUT_MICRODOLLARS_PER_1K)
  const fallbackOutput = safeCount(process.env.ROUTER_DEFAULT_OUTPUT_MICRODOLLARS_PER_1K)
  try {
    const result = await database.query<{ input: string; output: string }>(
      `SELECT input_microdollars_per_1k AS input, output_microdollars_per_1k AS output
         FROM router_model_prices
        WHERE model_id IN ($1, '*')
        ORDER BY CASE WHEN model_id = $1 THEN 0 ELSE 1 END
        LIMIT 1`,
      [model],
    )
    if (result.rows[0]) {
      return { input: safeCount(result.rows[0].input), output: safeCount(result.rows[0].output) }
    }
  } catch {
    // Keep the proxy usable during a rolling migration; operators can enable
    // enforcement and pricing after applying migration 003.
  }
  return { input: fallbackInput, output: fallbackOutput }
}

export async function usageCostMicrodollars(model: string, promptTokens: number, completionTokens: number): Promise<number> {
  const price = await modelPrice(model)
  return Math.floor((safeCount(promptTokens) * price.input + safeCount(completionTokens) * price.output) / 1000)
}

export async function estimateRequestBudget(model: string, estimatedInputTokens: number, maxOutputTokens: number): Promise<{ tokens: number; costMicrodollars: number }> {
  const promptTokens = Math.max(Math.min(safeCount(estimatedInputTokens), 10_000_000), 1)
  const completionTokens = Math.max(Math.min(safeCount(maxOutputTokens), 10_000_000), 1)
  return {
    tokens: promptTokens + completionTokens,
    costMicrodollars: await usageCostMicrodollars(model, promptTokens, completionTokens),
  }
}

export async function reservePublicRequest(address: string, limit: number): Promise<boolean> {
  const effectiveLimit = Number.isSafeInteger(limit) && limit > 0 ? limit : 10
  const bucketKey = createHash("sha256").update(address).digest("hex")
  const window = currentMinute()
  const client = await database.connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`public:${bucketKey}`])
    const current = await client.query<{ request_count: string }>(
      `SELECT request_count::text FROM router_public_rate_limit_buckets
        WHERE bucket_key = $1 AND window_start = $2 FOR UPDATE`,
      [bucketKey, window],
    )
    const count = safeCount(current.rows[0]?.request_count)
    if (count >= effectiveLimit) {
      await client.query("COMMIT")
      return false
    }
    await client.query(
      `INSERT INTO router_public_rate_limit_buckets (bucket_key, window_start, request_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (bucket_key, window_start)
       DO UPDATE SET request_count = router_public_rate_limit_buckets.request_count + 1`,
      [bucketKey, window],
    )
    await client.query("COMMIT")
    return true
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
  readonly scope: PrincipalScope
  readonly kind: "requests" | "tokens" | "spend" | "rate" | "concurrency"

  constructor(scope: PrincipalScope, kind: QuotaExceededError["kind"], limit: number, used: number, reserved: number) {
    super(`${kind} limit reached for ${scopeLabel(scope)}.`)
    this.name = "QuotaExceededError"
    this.scope = scope
    this.kind = kind
    this.limit = limit
    this.used = used
    this.reserved = reserved
  }
}

/**
 * Atomically reserve request capacity against every applicable policy. The
 * transaction and Postgres row locks make this work across multiple Next.js
 * replicas without requiring Redis.
 */
export async function reserveRequest(principal: AuthenticatedPrincipal, estimatedTokens = 0, estimatedCostMicrodollars = 0): Promise<string | null> {
  const policies = await effectivePolicies(principal)
  if (policies.length === 0) return null

  const client = await database.connect()
  try {
    await client.query("BEGIN")
    await client.query("DELETE FROM router_quota_reservations WHERE expires_at <= now()")
    await client.query("DELETE FROM router_rate_limit_buckets WHERE window_start < now() - interval '2 hours'")
    const window = currentMinute()

    for (const policy of policies) {
      const scope: PrincipalScope = { type: policy.scopeType, id: policy.scopeId }
      const column = scopeColumn(scope.type)
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [scopeLabel(scope)])
      const totals = await scopedTotals(client, scope)

      if (policy.requestsPerDay !== null && totals.usedToday + totals.reservedToday >= policy.requestsPerDay) {
        throw new QuotaExceededError(scope, "requests", policy.requestsPerDay, totals.usedToday, totals.reservedToday)
      }
      if (policy.maxConcurrentRequests !== null) {
        const active = await client.query(
          `SELECT count(*)::text AS active FROM router_quota_reservations
            WHERE ${column} = $1 AND expires_at > now()`,
          [scope.id],
        )
        const activeCount = safeCount(active.rows[0]?.active)
        if (activeCount >= policy.maxConcurrentRequests) {
          throw new QuotaExceededError(scope, "concurrency", policy.maxConcurrentRequests, activeCount, 0)
        }
      }
      if (policy.tokensPerMonth !== null && totals.tokensMonth + totals.reservedTokensMonth + estimatedTokens > policy.tokensPerMonth) {
        throw new QuotaExceededError(scope, "tokens", policy.tokensPerMonth, totals.tokensMonth, totals.reservedTokensMonth)
      }
      if (policy.spendLimitMicrodollarsPerMonth !== null && totals.spendMonth + totals.reservedSpendMonth + estimatedCostMicrodollars > policy.spendLimitMicrodollarsPerMonth) {
        throw new QuotaExceededError(scope, "spend", policy.spendLimitMicrodollarsPerMonth, totals.spendMonth, totals.reservedSpendMonth)
      }

      if (policy.requestsPerMinute !== null) {
        const bucket = await client.query<{ request_count: number }>(
          `SELECT request_count FROM router_rate_limit_buckets
            WHERE scope_type = $1 AND scope_id = $2 AND window_start = $3 FOR UPDATE`,
          [scope.type, scope.id, window],
        )
        const current = safeCount(bucket.rows[0]?.request_count)
        if (current >= policy.requestsPerMinute) {
          throw new QuotaExceededError(scope, "rate", policy.requestsPerMinute, current, 0)
        }
        if (bucket.rowCount) {
          await client.query(
            `UPDATE router_rate_limit_buckets
                SET request_count = request_count + 1, token_count = token_count + $4
              WHERE scope_type = $1 AND scope_id = $2 AND window_start = $3`,
            [scope.type, scope.id, window, estimatedTokens],
          )
        } else {
          await client.query(
            `INSERT INTO router_rate_limit_buckets (scope_type, scope_id, window_start, request_count, token_count)
             VALUES ($1, $2, $3, 1, $4)`,
            [scope.type, scope.id, window, estimatedTokens],
          )
        }
      }
    }

    const reservation = await client.query<{ id: string }>(
      `INSERT INTO router_quota_reservations
        (identity, user_id, api_key_id, organization_id, estimated_tokens,
         estimated_cost_microdollars, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 * interval '1 millisecond'))
       RETURNING id::text`,
      [principal.identity, principal.userId, principal.keyId, principal.organizationId, estimatedTokens, estimatedCostMicrodollars, reservationLifetimeMs],
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

export async function releaseRequest(reservationId: string | null | undefined): Promise<void> {
  if (!reservationId) return
  await database.query("DELETE FROM router_quota_reservations WHERE id = $1::uuid", [reservationId])
}

async function createBudgetAlerts(client: Queryable, record: UsageRecord) {
  const scopes = [
    { type: "user" as const, id: record.userId },
    ...(record.apiKeyId ? [{ type: "api_key" as const, id: record.apiKeyId }] : []),
    ...(record.organizationId ? [{ type: "organization" as const, id: record.organizationId }] : []),
  ]
  const periodStart = periodStartUtc()

  for (const scope of scopes) {
    const policyResult = await client.query(
      `SELECT tokens_per_month, spend_limit_microdollars_per_month, alert_threshold_percent
         FROM router_policies WHERE scope_type = $1 AND scope_id = $2`,
      [scope.type, scope.id],
    )
    const policy = policyResult.rows[0] as { tokens_per_month: string | number | null; spend_limit_microdollars_per_month: string | number | null; alert_threshold_percent: string | number | null } | undefined
    if (!policy) continue
    const tokenLimit = policy.tokens_per_month === null ? null : safeCount(policy.tokens_per_month)
    const spendLimit = policy.spend_limit_microdollars_per_month === null ? null : safeCount(policy.spend_limit_microdollars_per_month)
    const alertThresholdPercent = safeCount(policy.alert_threshold_percent) || 80
    const column = scopeColumn(scope.type)
    const totals = await client.query(
      `SELECT COALESCE(sum(total_tokens), 0)::text AS tokens,
              COALESCE(sum(cost_microdollars), 0)::text AS spend
         FROM router_usage WHERE ${column} = $1 AND created_at >= date_trunc('month', now())`,
      [scope.id],
    )
    const tokens = safeCount(totals.rows[0]?.tokens)
    const spend = safeCount(totals.rows[0]?.spend)
    const threshold = alertThresholdPercent / 100
    const crossed = (tokenLimit !== null && tokens >= tokenLimit * threshold)
      || (spendLimit !== null && spend >= spendLimit * threshold)
    if (!crossed) continue

    const kind = spendLimit !== null && spend >= spendLimit * threshold ? "spend_threshold" : "token_threshold"
    await client.query(
      `INSERT INTO router_alerts (scope_type, scope_id, kind, period_start, message)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (scope_type, scope_id, kind, period_start) DO NOTHING`,
      [scope.type, scope.id, kind, periodStart, `${kind === "spend_threshold" ? "Spend" : "Token"} budget has crossed ${alertThresholdPercent}% of its monthly limit.`],
    )
  }
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
        (identity, user_id, api_key_id, organization_id, model, status, request_id,
         duration_ms, prompt_tokens, completion_tokens, total_tokens,
         cost_microdollars, streamed, application_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        safeText(record.identity, 255),
        safeText(record.userId, 255),
        record.apiKeyId || null,
        record.organizationId || null,
        safeText(record.model, 255),
        Number.isInteger(record.status) && record.status >= 100 && record.status <= 599 ? record.status : 500,
        record.requestId ? safeText(record.requestId, 255) : null,
        Number.isSafeInteger(record.durationMs) && record.durationMs >= 0 ? record.durationMs : 0,
        safeCount(record.promptTokens),
        safeCount(record.completionTokens),
        safeCount(record.totalTokens),
        safeCount(record.costMicrodollars),
        record.streamed,
        record.applicationId || null,
      ],
    )
    await createBudgetAlerts(client, record)
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}

export async function getQuotaStatus(principal: AuthenticatedPrincipal): Promise<QuotaStatus> {
  const policies = await effectivePolicies(principal)
  const dailyPolicies = policies.filter((policy) => policy.requestsPerDay !== null)
  if (dailyPolicies.length === 0) return { limit: 0, used: 0, reserved: 0, remaining: null }

  const statuses = await Promise.all(dailyPolicies.map(async (policy) => {
    const totals = await scopedTotals(database, { type: policy.scopeType, id: policy.scopeId })
    return {
      limit: policy.requestsPerDay || 0,
      used: totals.usedToday,
      reserved: totals.reservedToday,
      remaining: Math.max((policy.requestsPerDay || 0) - totals.usedToday - totals.reservedToday, 0),
    }
  }))
  return statuses.sort((a, b) => a.remaining - b.remaining)[0]
}

export async function getBillingSummary(principal: AuthenticatedPrincipal): Promise<BillingSummary> {
  const start = periodStartUtc()
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
  const result = await database.query<{
    model: string; requests: string; tokens: string; spend: string
  }>(
    `SELECT model, count(*)::text AS requests,
            COALESCE(sum(total_tokens), 0)::text AS tokens,
            COALESCE(sum(cost_microdollars), 0)::text AS spend
       FROM router_usage
      WHERE user_id = $1 AND created_at >= $2 AND created_at < $3
      GROUP BY model ORDER BY sum(cost_microdollars) DESC, model ASC`,
    [principal.userId, start, end],
  )
  const byModel = result.rows.map((row) => ({
    model: row.model,
    requests: safeCount(row.requests),
    tokens: safeCount(row.tokens),
    spendCents: Math.ceil(safeCount(row.spend) / 10_000),
  }))
  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    requests: byModel.reduce((sum, row) => sum + row.requests, 0),
    totalTokens: byModel.reduce((sum, row) => sum + row.tokens, 0),
    spendCents: byModel.reduce((sum, row) => sum + row.spendCents, 0),
    byModel,
  }
}

export async function getPublicRankings(limit = 50): Promise<PublicRanking[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const result = await database.query<{
    model: string; tokens_24h: string; tokens_7d: string; tokens_30d: string; tokens_all: string;
    previous_tokens_24h: string; previous_tokens_7d: string; previous_tokens_30d: string;
    requests_24h: string; requests_7d: string; requests_30d: string; requests_all: string
  }>(
    `SELECT model,
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
     FROM router_usage WHERE status >= 200 AND status < 300
     GROUP BY model HAVING COUNT(*) > 0
     ORDER BY SUM(total_tokens) FILTER (WHERE created_at >= now() - interval '30 days') DESC, COUNT(*) DESC, model ASC
     LIMIT $1`,
    [boundedLimit],
  )
  const parse = (value: string): number => safeCount(value)
  const change = (current: number, previous: number): number | null => previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(1))
  return result.rows.map((row) => {
    const tokens24h = parse(row.tokens_24h); const tokens7d = parse(row.tokens_7d); const tokens30d = parse(row.tokens_30d)
    return {
      modelId: row.model,
      tokens: { "24h": tokens24h, "7d": tokens7d, "30d": tokens30d, all: parse(row.tokens_all) },
      change: { "24h": change(tokens24h, parse(row.previous_tokens_24h)), "7d": change(tokens7d, parse(row.previous_tokens_7d)), "30d": change(tokens30d, parse(row.previous_tokens_30d)), all: null },
      requests: { "24h": parse(row.requests_24h), "7d": parse(row.requests_7d), "30d": parse(row.requests_30d), all: parse(row.requests_all) },
    }
  })
}

export async function listUsage(identity: string, limit = 100): Promise<Array<UsageRecord & { id: string; createdAt: string }>> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100)
  const result = await database.query(
    `SELECT id, identity, user_id, api_key_id, organization_id, model, status,
            request_id, duration_ms, prompt_tokens, completion_tokens, total_tokens,
            cost_microdollars, streamed, application_id, created_at
       FROM router_usage WHERE identity = $1 ORDER BY created_at DESC LIMIT $2`,
    [identity, boundedLimit],
  )
  return result.rows.map((row) => ({
    id: row.id, identity: row.identity, userId: row.user_id, apiKeyId: row.api_key_id,
    organizationId: row.organization_id, model: row.model, status: row.status,
    requestId: row.request_id, durationMs: row.duration_ms, promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens, totalTokens: row.total_tokens,
    costMicrodollars: row.cost_microdollars, streamed: row.streamed,
    applicationId: row.application_id, createdAt: row.created_at.toISOString(),
  }))
}
