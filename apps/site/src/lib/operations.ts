import { database } from "@/lib/database"
import Stripe from "stripe"
import type { AuthenticatedPrincipal, PrincipalScope } from "@/lib/request-auth"

export interface InvoiceRecord {
  id: string
  number: string | null
  status: string | null
  amountCents: number
  currency: string
  hostedInvoiceUrl: string | null
  createdAt: string
  dueDate: string | null
}

export interface AlertRecord {
  id: string
  scopeType: PrincipalScope["type"]
  scopeId: string
  kind: string
  message: string
  acknowledgedAt: string | null
  createdAt: string
}

function scopePredicate(scopes: PrincipalScope[]): { sql: string; params: string[] } {
  if (scopes.length === 0) return { sql: "FALSE", params: [] }
  const params: string[] = []
  const clauses = scopes.map((scope, index) => {
    params.push(scope.type, scope.id)
    return `($${index * 2 + 1}, $${index * 2 + 2})`
  })
  return { sql: `(scope_type, scope_id) IN (${clauses.join(", ")})`, params }
}

export async function listInvoices(principal: AuthenticatedPrincipal): Promise<InvoiceRecord[]> {
  if (process.env.DEPLOYMENT_MODE !== "managed" || !process.env.STRIPE_SECRET_KEY) return []
  const customerResult = await database.query<{ stripeCustomerId: string }>(
    `SELECT "stripeCustomerId" FROM "user" WHERE id = $1 LIMIT 1`,
    [principal.userId],
  )
  const customerId = customerResult.rows[0]?.stripeCustomerId
  if (!customerId) return []
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const invoices = await stripe.invoices.list({ customer: customerId, limit: 12 })
  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amountCents: invoice.amount_due,
    currency: invoice.currency,
    hostedInvoiceUrl: invoice.hosted_invoice_url || null,
    createdAt: new Date(invoice.created * 1000).toISOString(),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
  }))
}

export async function listAlerts(principal: AuthenticatedPrincipal, includeAcknowledged = false): Promise<AlertRecord[]> {
  const predicate = scopePredicate(principal.scopes)
  const result = await database.query(
    `SELECT id, scope_type, scope_id, kind, message, acknowledged_at, created_at
       FROM router_alerts
      WHERE ${predicate.sql} ${includeAcknowledged ? "" : "AND acknowledged_at IS NULL"}
      ORDER BY created_at DESC LIMIT 100`,
    predicate.params,
  )
  return result.rows.map((row) => ({
    id: row.id,
    scopeType: row.scope_type,
    scopeId: row.scope_id,
    kind: row.kind,
    message: row.message,
    acknowledgedAt: row.acknowledged_at?.toISOString() || null,
    createdAt: row.created_at.toISOString(),
  }))
}

export async function acknowledgeAlert(principal: AuthenticatedPrincipal, id: string): Promise<boolean> {
  const predicate = scopePredicate(principal.scopes)
  const result = await database.query(
    `UPDATE router_alerts
        SET acknowledged_at = COALESCE(acknowledged_at, now())
      WHERE id = $${predicate.params.length + 1}::uuid AND ${predicate.sql}
      RETURNING id`,
    [...predicate.params, id],
  )
  return Boolean(result.rowCount)
}
