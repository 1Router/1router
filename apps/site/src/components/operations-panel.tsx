"use client"

import { useEffect, useState } from "react"
import type { AlertRecord, InvoiceRecord } from "@/lib/operations"
import type { BillingSummary } from "@/lib/usage"

type ScopeType = "user" | "api_key" | "organization"
type Policy = {
  scopeType: ScopeType
  scopeId: string
  requestsPerDay: number | null
  requestsPerMinute: number | null
  maxConcurrentRequests: number | null
  tokensPerMonth: number | null
  spendLimitMicrodollarsPerMonth: number | null
  alertThresholdPercent: number
}

type Props = {
  userId: string
  billing: BillingSummary
  alerts: AlertRecord[]
}

const blank = { requestsPerDay: "", requestsPerMinute: "", maxConcurrentRequests: "", tokensPerMonth: "", spendLimitCentsPerMonth: "", alertThresholdPercent: "80" }

export function OperationsPanel({ userId, billing, alerts: initialAlerts }: Props) {
  const [scopeType, setScopeType] = useState<ScopeType>("user")
  const [scopeId, setScopeId] = useState(userId)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [values, setValues] = useState(blank)
  const [alerts, setAlerts] = useState(initialAlerts)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

  function valuesForPolicy(policy: Policy | undefined) {
    return policy ? {
      requestsPerDay: policy.requestsPerDay?.toString() || "",
      requestsPerMinute: policy.requestsPerMinute?.toString() || "",
      maxConcurrentRequests: policy.maxConcurrentRequests?.toString() || "",
      tokensPerMonth: policy.tokensPerMonth?.toString() || "",
      spendLimitCentsPerMonth: policy.spendLimitMicrodollarsPerMonth === null ? "" : Math.ceil(policy.spendLimitMicrodollarsPerMonth / 10_000).toString(),
      alertThresholdPercent: policy.alertThresholdPercent.toString(),
    } : blank
  }

  useEffect(() => {
    fetch("/api/policies")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load policies")))
      .then((payload: { data?: Policy[] }) => {
        const nextPolicies = payload.data || []
        setPolicies(nextPolicies)
        setValues(valuesForPolicy(nextPolicies.find((item) => item.scopeType === "user" && item.scopeId === userId)))
      })
      .catch(() => setMessage("Policies are unavailable until the operations migration is applied."))
    fetch("/api/billing/invoices")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load invoices")))
      .then((payload: { data?: InvoiceRecord[] }) => setInvoices(payload.data || []))
      .catch(() => undefined)
  }, [userId])

  function changeScopeType(value: ScopeType) {
    const nextScopeId = value === "user" ? userId : ""
    setScopeType(value)
    setScopeId(nextScopeId)
    setValues(valuesForPolicy(policies.find((item) => item.scopeType === value && item.scopeId === nextScopeId)))
  }

  async function savePolicy() {
    setPending(true)
    setMessage("")
    const response = await fetch("/api/policies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scopeType,
        scopeId,
        requestsPerDay: values.requestsPerDay === "" ? null : Number(values.requestsPerDay),
        requestsPerMinute: values.requestsPerMinute === "" ? null : Number(values.requestsPerMinute),
        maxConcurrentRequests: values.maxConcurrentRequests === "" ? null : Number(values.maxConcurrentRequests),
        tokensPerMonth: values.tokensPerMonth === "" ? null : Number(values.tokensPerMonth),
        spendLimitCentsPerMonth: values.spendLimitCentsPerMonth === "" ? null : Number(values.spendLimitCentsPerMonth),
        alertThresholdPercent: Number(values.alertThresholdPercent || 80),
      }),
    })
    const payload = await response.json().catch(() => null) as { data?: Policy; error?: { message?: string } } | null
    setPending(false)
    if (!response.ok || !payload?.data) {
      setMessage(payload?.error?.message || "Unable to save policy.")
      return
    }
    setPolicies((current) => [...current.filter((item) => !(item.scopeType === payload.data!.scopeType && item.scopeId === payload.data!.scopeId)), payload.data!])
    setMessage("Policy saved. New requests will be enforced across every matching scope.")
  }

  async function acknowledge(id: string) {
    const response = await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    if (response.ok) setAlerts((current) => current.filter((alert) => alert.id !== id))
  }

  const inputClass = "min-h-[42px] w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"

  return (
    <section className="mt-8 grid gap-6 md:grid-cols-2">
      <div className="rounded-2xl border border-border/60 bg-card p-6 md:col-span-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Operations</p>
            <h2 className="mt-1 text-lg font-semibold">Budgets and enforcement</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Policies are stored in PostgreSQL and enforced atomically across replicas. The strictest matching user, API-key, and organization policy wins.</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Distributed controls</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">Scope<select value={scopeType} onChange={(event) => changeScopeType(event.target.value as ScopeType)} className={`${inputClass} mt-1.5`}><option value="user">My user</option><option value="api_key">API key</option><option value="organization">Organization</option></select></label>
          <label className="text-sm font-medium sm:col-span-2">Scope ID<input value={scopeId} onChange={(event) => setScopeId(event.target.value)} disabled={scopeType === "user"} className={`${inputClass} mt-1.5 disabled:opacity-60`} /></label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-medium text-muted-foreground">Requests / day<input value={values.requestsPerDay} onChange={(event) => setValues({ ...values, requestsPerDay: event.target.value })} placeholder="Unlimited" inputMode="numeric" className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-medium text-muted-foreground">Requests / minute<input value={values.requestsPerMinute} onChange={(event) => setValues({ ...values, requestsPerMinute: event.target.value })} placeholder="Unlimited" inputMode="numeric" className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-medium text-muted-foreground">Concurrent requests<input value={values.maxConcurrentRequests} onChange={(event) => setValues({ ...values, maxConcurrentRequests: event.target.value })} placeholder="Unlimited" inputMode="numeric" className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-medium text-muted-foreground">Tokens / month<input value={values.tokensPerMonth} onChange={(event) => setValues({ ...values, tokensPerMonth: event.target.value })} placeholder="Unlimited" inputMode="numeric" className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-medium text-muted-foreground">Spend / month (¢)<input value={values.spendLimitCentsPerMonth} onChange={(event) => setValues({ ...values, spendLimitCentsPerMonth: event.target.value })} placeholder="Unlimited" inputMode="numeric" className={`${inputClass} mt-1`} /></label>
          <label className="text-xs font-medium text-muted-foreground">Alert at (%)<input value={values.alertThresholdPercent} onChange={(event) => setValues({ ...values, alertThresholdPercent: event.target.value })} inputMode="numeric" className={`${inputClass} mt-1`} /></label>
        </div>
        <button type="button" onClick={savePolicy} disabled={pending || !scopeId} className="mt-4 min-h-[42px] rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">{pending ? "Saving…" : "Save policy"}</button>
        {message && <p role="status" className="mt-3 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">{message}</p>}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <p className="text-sm font-medium text-primary">This month</p>
        <h2 className="mt-1 text-lg font-semibold">Usage statement</h2>
        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-secondary/60 p-3"><div className="text-xl font-bold">{billing.requests.toLocaleString()}</div><div className="text-xs text-muted-foreground">requests</div></div>
          <div className="rounded-xl bg-secondary/60 p-3"><div className="text-xl font-bold">{billing.totalTokens.toLocaleString()}</div><div className="text-xs text-muted-foreground">tokens</div></div>
          <div className="rounded-xl bg-secondary/60 p-3"><div className="text-xl font-bold">${(billing.spendCents / 100).toFixed(2)}</div><div className="text-xs text-muted-foreground">tracked usage</div></div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Provider charges are represented by the configured model price table. Stripe subscription invoices remain available in the billing portal.</p>
        {billing.byModel.length > 0 && <div className="mt-4 space-y-2">{billing.byModel.slice(0, 5).map((item) => <div key={item.model} className="flex justify-between gap-3 text-sm"><span className="truncate font-mono text-xs">{item.model}</span><span className="shrink-0 text-muted-foreground">{item.tokens.toLocaleString()} tokens</span></div>)}</div>}
        {invoices.length > 0 && <div className="mt-5 border-t border-border/60 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent invoices</p><div className="mt-2 space-y-2">{invoices.slice(0, 3).map((invoice) => <a key={invoice.id} href={invoice.hostedInvoiceUrl || "#"} target="_blank" rel="noreferrer" className="flex justify-between gap-3 text-sm hover:text-primary"><span>{invoice.number || invoice.id}</span><span className="text-muted-foreground">{(invoice.amountCents / 100).toFixed(2)} {invoice.currency.toUpperCase()}</span></a>)}</div></div>}
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex items-center justify-between"><div><p className="text-sm font-medium text-primary">Alerts</p><h2 className="mt-1 text-lg font-semibold">Budget notifications</h2></div><span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">{alerts.length}</span></div>
        {alerts.length === 0 ? <p className="mt-5 text-sm text-muted-foreground">No active budget alerts.</p> : <div className="mt-4 space-y-3">{alerts.map((alert) => <div key={alert.id} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"><p className="text-sm">{alert.message}</p><button type="button" onClick={() => void acknowledge(alert.id)} className="mt-2 text-xs font-semibold text-primary hover:underline">Acknowledge</button></div>)}</div>}
      </div>
    </section>
  )
}
