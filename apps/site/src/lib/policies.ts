import { database } from "@/lib/database"
import { recordAuditEvent } from "@/lib/audit"
import type { AuthenticatedPrincipal, PrincipalScope, PrincipalScopeType } from "@/lib/request-auth"

export interface Policy {
  scopeType: PrincipalScopeType
  scopeId: string
  requestsPerDay: number | null
  requestsPerMinute: number | null
  maxConcurrentRequests: number | null
  tokensPerMonth: number | null
  spendLimitMicrodollarsPerMonth: number | null
  alertThresholdPercent: number
}

export interface PolicyInput {
  scopeType: PrincipalScopeType
  scopeId: string
  requestsPerDay?: number | null
  requestsPerMinute?: number | null
  maxConcurrentRequests?: number | null
  tokensPerMonth?: number | null
  spendLimitCentsPerMonth?: number | null
  alertThresholdPercent?: number
}

function nonNegativeInteger(value: unknown, field: string, max = Number.MAX_SAFE_INTEGER): number | null {
  if (value === null || value === undefined || value === "") return null
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isSafeInteger(number) || number < 0 || number > max) throw new Error(`${field} must be a non-negative integer.`)
  return number
}

function percent(value: unknown): number {
  const number = value === null || value === undefined || value === "" ? 80 : Number(value)
  if (!Number.isSafeInteger(number) || number < 1 || number > 100) throw new Error("alertThresholdPercent must be between 1 and 100.")
  return number
}

function rowToPolicy(row: Record<string, unknown>): Policy {
  return {
    scopeType: row.scope_type as PrincipalScopeType,
    scopeId: String(row.scope_id),
    requestsPerDay: row.requests_per_day === null ? null : Number(row.requests_per_day),
    requestsPerMinute: row.requests_per_minute === null ? null : Number(row.requests_per_minute),
    maxConcurrentRequests: row.max_concurrent_requests === null ? null : Number(row.max_concurrent_requests),
    tokensPerMonth: row.tokens_per_month === null ? null : Number(row.tokens_per_month),
    spendLimitMicrodollarsPerMonth: row.spend_limit_microdollars_per_month === null ? null : Number(row.spend_limit_microdollars_per_month),
    alertThresholdPercent: Number(row.alert_threshold_percent || 80),
  }
}

export function scopesForPrincipal(principal: AuthenticatedPrincipal): PrincipalScope[] {
  return principal.scopes
}

export async function getPolicies(scopes: PrincipalScope[]): Promise<Policy[]> {
  if (scopes.length === 0) return []
  const values: string[] = []
  const params: string[] = []
  scopes.forEach((scope, index) => {
    values.push(`($${index * 2 + 1}, $${index * 2 + 2})`)
    params.push(scope.type, scope.id)
  })
  const result = await database.query(
    `SELECT scope_type, scope_id, requests_per_day, requests_per_minute,
            max_concurrent_requests, tokens_per_month, spend_limit_microdollars_per_month,
            alert_threshold_percent
       FROM router_policies
      WHERE (scope_type, scope_id) IN (${values.join(", ")})
      ORDER BY CASE scope_type WHEN 'organization' THEN 1 WHEN 'api_key' THEN 2 ELSE 3 END`,
    params,
  )
  return result.rows.map((row) => rowToPolicy(row))
}

export function configuredFallbackPolicy(userId: string): Policy | null {
  const value = Number.parseInt(process.env.ROUTER_REQUESTS_PER_DAY || "0", 10)
  if (!Number.isSafeInteger(value) || value <= 0) return null
  return {
    scopeType: "user",
    scopeId: userId,
    requestsPerDay: value,
    requestsPerMinute: null,
    maxConcurrentRequests: null,
    tokensPerMonth: null,
    spendLimitMicrodollarsPerMonth: null,
    alertThresholdPercent: 80,
  }
}

export async function effectivePolicies(principal: AuthenticatedPrincipal): Promise<Policy[]> {
  const policies = await getPolicies(principal.scopes)
  if (!policies.some((policy) => policy.scopeType === "user")) {
    const fallback = configuredFallbackPolicy(principal.userId)
    if (fallback) policies.push(fallback)
  }
  return policies
}

export async function canManageScope(principal: AuthenticatedPrincipal, scopeType: PrincipalScopeType, scopeId: string): Promise<boolean> {
  if (scopeType === "user") return scopeId === principal.userId
  if (scopeType === "api_key") {
    const result = await database.query(
      `SELECT 1 FROM apikey WHERE id = $1 AND "referenceId" = $2 LIMIT 1`,
      [scopeId, principal.userId],
    )
    return Boolean(result.rowCount)
  }
  const result = await database.query(
    `SELECT 1
       FROM member
      WHERE "userId" = $1 AND "organizationId" = $2
        AND role IN ('owner', 'admin')
      LIMIT 1`,
    [principal.userId, scopeId],
  )
  return Boolean(result.rowCount)
}

export async function upsertPolicy(principal: AuthenticatedPrincipal, input: PolicyInput): Promise<Policy> {
  const scopeId = input.scopeId.trim()
  if (!scopeId || !(await canManageScope(principal, input.scopeType, scopeId))) {
    throw new Error("You do not have permission to manage this policy scope.")
  }

  const requestsPerDay = nonNegativeInteger(input.requestsPerDay, "requestsPerDay")
  const requestsPerMinute = nonNegativeInteger(input.requestsPerMinute, "requestsPerMinute")
  const maxConcurrentRequests = nonNegativeInteger(input.maxConcurrentRequests, "maxConcurrentRequests")
  const tokensPerMonth = nonNegativeInteger(input.tokensPerMonth, "tokensPerMonth", 9_000_000_000_000_000)
  const spendCents = nonNegativeInteger(input.spendLimitCentsPerMonth, "spendLimitCentsPerMonth", 900_000_000_000)
  const spendMicrodollars = spendCents === null ? null : spendCents * 10_000
  const alertThresholdPercent = percent(input.alertThresholdPercent)

  const result = await database.query(
    `INSERT INTO router_policies
      (scope_type, scope_id, requests_per_day, requests_per_minute,
       max_concurrent_requests, tokens_per_month, spend_limit_microdollars_per_month,
       alert_threshold_percent, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
     ON CONFLICT (scope_type, scope_id) DO UPDATE SET
       requests_per_day = EXCLUDED.requests_per_day,
       requests_per_minute = EXCLUDED.requests_per_minute,
       max_concurrent_requests = EXCLUDED.max_concurrent_requests,
       tokens_per_month = EXCLUDED.tokens_per_month,
       spend_limit_microdollars_per_month = EXCLUDED.spend_limit_microdollars_per_month,
       alert_threshold_percent = EXCLUDED.alert_threshold_percent,
       updated_at = now()
     RETURNING scope_type, scope_id, requests_per_day, requests_per_minute,
       max_concurrent_requests, tokens_per_month, spend_limit_microdollars_per_month, alert_threshold_percent`,
    [scopeTypeValue(input.scopeType), scopeId, requestsPerDay, requestsPerMinute, maxConcurrentRequests, tokensPerMonth, spendMicrodollars, alertThresholdPercent],
  )
  const policy = rowToPolicy(result.rows[0])
  void recordAuditEvent({
    eventType: "policy.updated",
    identity: principal.identity,
    userId: principal.userId,
    apiKeyId: principal.keyId,
    organizationId: principal.organizationId,
    metadata: { scopeType: policy.scopeType, scopeId: policy.scopeId },
  })
  return policy
}

function scopeTypeValue(value: PrincipalScopeType): PrincipalScopeType {
  if (value === "user" || value === "api_key" || value === "organization") return value
  throw new Error("Invalid policy scope.")
}

export function policyForScope(policies: Policy[], scope: PrincipalScope): Policy | null {
  return policies.find((policy) => policy.scopeType === scope.type && policy.scopeId === scope.id) || null
}
