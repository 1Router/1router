import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AccountActions } from "@/components/account-actions"
import { getBillingSummary, getQuotaStatus, listUsage } from "@/lib/usage"
import { listAlerts } from "@/lib/operations"
import { auth, authConfigurationError } from "@/lib/auth"

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your 1Router account, workspace, API keys, and billing.",
}

export default async function AccountPage() {
  if (authConfigurationError) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold">Account services are not configured</h1>
          <p className="mt-2 text-sm text-muted-foreground">{authConfigurationError}</p>
        </div>
      </div>
    )
  }

  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect("/sign-in")

  let usage: Awaited<ReturnType<typeof listUsage>> = []
  let quota: Awaited<ReturnType<typeof getQuotaStatus>> = { limit: 0, used: 0, reserved: 0, remaining: null }
  let billing: Awaited<ReturnType<typeof getBillingSummary>> = { periodStart: new Date().toISOString(), periodEnd: new Date().toISOString(), requests: 0, totalTokens: 0, spendCents: 0, byModel: [] }
  let alerts: Awaited<ReturnType<typeof listAlerts>> = []
  try {
    const identity = `user:${session.user.id}`
    const principal = { userId: session.user.id, identity, keyId: null, organizationId: null, scopes: [{ type: "user" as const, id: session.user.id }] }
    ;[usage, quota, billing, alerts] = await Promise.all([listUsage(identity, 20), getQuotaStatus(principal), getBillingSummary(principal), listAlerts(principal)])
  } catch (error) {
    console.error("account usage query failed", error)
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-primary">Account</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome, {session.user.name}</h1>
          <p className="mt-2 text-muted-foreground">{session.user.email}</p>
        </div>
        <AccountActions
          userId={session.user.id}
          billing={billing}
          alerts={alerts}
          billingEnabled={Boolean(
            process.env.STRIPE_SECRET_KEY &&
              process.env.STRIPE_WEBHOOK_SECRET &&
              process.env.STRIPE_PRICE_ID &&
              process.env.DEPLOYMENT_MODE === "managed",
          )}
        />
        <section className="mt-8 rounded-2xl border border-border/60 bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recent usage</h2>
              <p className="mt-1 text-sm text-muted-foreground">The latest requests recorded by this deployment.</p>
            </div>
            <div className="text-left text-sm sm:text-right">
              <div className="font-semibold">{quota.limit === 0 ? "Unlimited" : `${quota.remaining} left today`}</div>
              {quota.limit > 0 && <div className="text-muted-foreground">{quota.used} / {quota.limit} used</div>}
            </div>
            <a href="/api/usage" className="inline-flex min-h-[44px] items-center text-sm font-medium text-primary hover:underline">JSON API</a>
          </div>
          {usage.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">No usage has been recorded yet. Run the ledger bootstrap before production use.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr><th className="pb-2 pr-4">Model</th><th className="pb-2 pr-4">Tokens</th><th className="pb-2 pr-4">Status</th><th className="pb-2">When</th></tr>
                </thead>
                <tbody>
                  {usage.map((item) => (
                    <tr key={item.id} className="border-b border-border/40 last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{item.model}</td>
                      <td className="py-3 pr-4">{item.totalTokens.toLocaleString()}</td>
                      <td className="py-3 pr-4">{item.status}</td>
                      <td className="py-3 text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
