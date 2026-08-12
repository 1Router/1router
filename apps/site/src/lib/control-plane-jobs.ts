import { database } from "./database"

export interface JobSummary {
  expiredReservations: number
  deletedRateBuckets: number
  deletedAlerts: number
  rolledUpUsage: number
  reconciledBilling: number
}

/**
 * Run one idempotent control-plane maintenance cycle. This is intentionally
 * external-process friendly: run it as a Kubernetes CronJob, a one-shot task,
 * or a long-running worker with CONTROL_PLANE_JOB_INTERVAL_SECONDS.
 */
export async function runControlPlaneJobs(): Promise<JobSummary> {
  const client = await database.connect()
  try {
    // Keep cleanup atomic and short. Aggregation is intentionally outside this
    // transaction so a large usage scan cannot hold cleanup locks open.
    await client.query("BEGIN")
    const reservations = await client.query(
      "DELETE FROM router_quota_reservations WHERE expires_at <= now()",
    )
    const buckets = await client.query(
      `DELETE FROM router_rate_limit_buckets WHERE window_start < now() - interval '2 hours'`,
    )
    const publicBuckets = await client.query(
      `DELETE FROM router_public_rate_limit_buckets WHERE window_start < now() - interval '2 hours'`,
    )
    const alerts = await client.query(
      `DELETE FROM router_alerts WHERE acknowledged_at IS NOT NULL AND created_at < now() - interval '90 days'`,
    )
    await client.query(
      `DELETE FROM router_audit_events WHERE created_at < now() - interval '180 days'`,
    )
    await client.query("COMMIT")

    // These upserts are independently atomic and safe to retry on the next
    // scheduled run if a database interruption occurs during aggregation.
    const usage = await client.query(
      `INSERT INTO router_usage_daily
        (usage_date, user_id, api_key_id, organization_id, model, requests,
         successful_requests, failed_requests, total_tokens, cost_microdollars,
         last_usage_at, updated_at)
       SELECT
         (created_at AT TIME ZONE 'UTC')::date,
         COALESCE(user_id, ''), COALESCE(api_key_id, ''), COALESCE(organization_id, ''),
         model, count(*),
         count(*) FILTER (WHERE status >= 200 AND status < 300),
         count(*) FILTER (WHERE status < 200 OR status >= 300),
         COALESCE(sum(total_tokens), 0), COALESCE(sum(cost_microdollars), 0),
         max(created_at), now()
       FROM router_usage
       WHERE created_at >= now() - interval '3 days'
       GROUP BY 1, 2, 3, 4, 5
       ON CONFLICT (usage_date, user_id, api_key_id, organization_id, model)
       DO UPDATE SET
         requests = EXCLUDED.requests,
         successful_requests = EXCLUDED.successful_requests,
         failed_requests = EXCLUDED.failed_requests,
         total_tokens = EXCLUDED.total_tokens,
         cost_microdollars = EXCLUDED.cost_microdollars,
         last_usage_at = EXCLUDED.last_usage_at,
         updated_at = now()`,
    )

    const billing = await client.query(
      `INSERT INTO router_billing_reconciliation
        (user_id, period_start, requests, total_tokens, cost_microdollars,
         last_usage_at, reconciled_at)
       SELECT
         COALESCE(user_id, substring(identity FROM 6)),
         date_trunc('month', created_at)::date,
         count(*), COALESCE(sum(total_tokens), 0), COALESCE(sum(cost_microdollars), 0),
         max(created_at), now()
       FROM router_usage
       WHERE created_at >= date_trunc('month', now())
         AND COALESCE(user_id, substring(identity FROM 6)) IS NOT NULL
       GROUP BY 1, 2
       ON CONFLICT (user_id, period_start)
       DO UPDATE SET
         requests = EXCLUDED.requests,
         total_tokens = EXCLUDED.total_tokens,
         cost_microdollars = EXCLUDED.cost_microdollars,
         last_usage_at = EXCLUDED.last_usage_at,
         reconciled_at = now()`,
    )

    return {
      expiredReservations: reservations.rowCount || 0,
      deletedRateBuckets: (buckets.rowCount || 0) + (publicBuckets.rowCount || 0),
      deletedAlerts: alerts.rowCount || 0,
      rolledUpUsage: usage.rowCount || 0,
      reconciledBilling: billing.rowCount || 0,
    }
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    throw error
  } finally {
    client.release()
  }
}
