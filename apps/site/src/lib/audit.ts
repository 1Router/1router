import { database } from "@/lib/database"

export interface AuditEvent {
  eventType: string
  identity?: string | null
  userId?: string | null
  apiKeyId?: string | null
  organizationId?: string | null
  model?: string | null
  provider?: string | null
  requestId?: string | null
  status?: number | null
  metadata?: Record<string, unknown>
}

/**
 * Audit writes must never break a model response. The caller can await this
 * function when an operation must be visible before returning, or deliberately
 * invoke it without awaiting for hot-path telemetry.
 */
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    await database.query(
      `INSERT INTO router_audit_events
        (event_type, identity, user_id, api_key_id, organization_id,
         model, provider, request_id, status, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        event.eventType.slice(0, 100),
        event.identity || null,
        event.userId || null,
        event.apiKeyId || null,
        event.organizationId || null,
        event.model || null,
        event.provider || null,
        event.requestId || null,
        event.status ?? null,
        JSON.stringify(event.metadata || {}),
      ],
    )
  } catch (error) {
    console.error("audit event write failed", error)
  }
}
