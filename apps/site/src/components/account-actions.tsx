"use client"

import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"

type Application = {
  id: string
  slug: string
  name: string
  description: string
  websiteUrl: string | null
  public: boolean
}

type ApplicationForm = {
  slug: string
  name: string
  description: string
  websiteUrl: string
  public: boolean
}

const emptyApplication: ApplicationForm = { slug: "", name: "", description: "", websiteUrl: "", public: false }

export function AccountActions({ billingEnabled }: { billingEnabled: boolean }) {
  const [keyName, setKeyName] = useState("default")
  const [createdKey, setCreatedKey] = useState("")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const [application, setApplication] = useState<ApplicationForm>(emptyApplication)
  const [applications, setApplications] = useState<Application[]>([])
  const [applicationsStatus, setApplicationsStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/applications", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Unable to load applications")))
      .then((payload: { data?: Application[] }) => {
        setApplications(payload.data || [])
        setApplicationsStatus("ready")
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setApplicationsStatus("error")
      })
    return () => controller.abort()
  }, [])

  async function createKey() {
    setPending(true)
    setMessage("")
    const result = await authClient.apiKey.create({ name: keyName, prefix: "router_" })
    setPending(false)

    if (result.error) {
      setMessage(result.error.message || "Unable to create API key.")
      return
    }

    setCreatedKey(result.data?.key || "")
    setMessage("Copy this key now. It will not be shown again.")
  }

  async function registerApplication() {
    setPending(true)
    setMessage("")
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(application),
    })
    const payload = await response.json().catch(() => null) as { data?: Application; error?: { message?: string } } | null
    setPending(false)
    if (!response.ok || !payload?.data) {
      setMessage(payload?.error?.message || "Unable to register application.")
      return
    }
    setApplications((current) => [payload.data!, ...current])
    setApplicationsStatus("ready")
    setApplication(emptyApplication)
    setMessage(`Application registered. Add X-1Router-Application: ${payload.data.slug} to requests from this app.`)
  }

  async function startSubscription() {
    setPending(true)
    setMessage("")
    const result = await authClient.subscription.upgrade({
      plan: "cloud",
      successUrl: `${window.location.origin}/account?billing=success`,
      cancelUrl: `${window.location.origin}/pricing`,
    })
    setPending(false)

    if (result.error) setMessage(result.error.message || "Stripe billing is not enabled on this deployment.")
    else if (result.data?.url) window.location.assign(result.data.url)
  }

  async function openPortal() {
    setPending(true)
    setMessage("")
    const result = await authClient.subscription.billingPortal({
      returnUrl: `${window.location.origin}/account`,
    })
    setPending(false)

    if (result.error) setMessage(result.error.message || "Billing portal is unavailable.")
    else if (result.data?.url) window.location.assign(result.data.url)
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">API keys</h2>
        <p className="mt-2 text-sm text-muted-foreground">Generate a personal key for the OpenAI-compatible API. Keys are owned by your Better Auth account.</p>
        <label className="mt-5 block text-sm font-medium">Key name<input value={keyName} onChange={(event) => setKeyName(event.target.value)} className="mt-1.5 min-h-[44px] w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
        <button type="button" onClick={createKey} disabled={pending || !keyName.trim()} className="mt-4 min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">Create API key</button>
        {createdKey && <code className="mt-4 block break-all rounded-lg bg-secondary p-3 text-xs">{createdKey}</code>}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Managed billing</h2>
        <p className="mt-2 text-sm text-muted-foreground">{billingEnabled ? "Manage the optional Stripe subscription for the 1Router managed service." : "Stripe billing is disabled on this self-hosted deployment. You own the infrastructure and provider relationships directly."}</p>
        {billingEnabled && <div className="mt-5 flex flex-col gap-3"><button type="button" onClick={startSubscription} disabled={pending} className="min-h-[44px] rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">Start managed plan</button><button type="button" onClick={openPortal} disabled={pending} className="min-h-[44px] rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60">Open billing portal</button></div>}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6 md:col-span-2">
        <h2 className="text-lg font-semibold">Applications and attribution</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Register the downstream apps that use your key. 1Router only attributes requests when the app sends its registered slug explicitly; it never guesses from User-Agent or Referer.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={application.slug} onChange={(event) => setApplication({ ...application, slug: event.target.value })} placeholder="slug, e.g. my-editor" aria-label="Application slug" className="min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <input value={application.name} onChange={(event) => setApplication({ ...application, name: event.target.value })} placeholder="Application name" aria-label="Application name" className="min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <input value={application.websiteUrl} onChange={(event) => setApplication({ ...application, websiteUrl: event.target.value })} placeholder="https://example.com (optional)" aria-label="Application website" className="min-h-[44px] rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <button type="button" onClick={registerApplication} disabled={pending || !application.slug.trim() || !application.name.trim()} className="min-h-[44px] rounded-lg border border-primary bg-primary/10 px-4 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:opacity-60">Register application</button>
        </div>
        <textarea value={application.description} onChange={(event) => setApplication({ ...application, description: event.target.value })} placeholder="Short public description (optional)" aria-label="Application description" className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" checked={application.public} onChange={(event) => setApplication({ ...application, public: event.target.checked })} />Show verified usage in the public App Showcase</label>
        <div className="mt-4 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs text-muted-foreground"><span>Send this header from the registered app: </span><code className="break-all font-mono text-foreground">X-1Router-Application: your-slug</code></div>
        {applicationsStatus === "loading" && <p className="mt-5 text-sm text-muted-foreground">Loading registered applications…</p>}
        {applicationsStatus === "error" && <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">Registered applications could not be loaded. Try refreshing the page.</p>}
        {applicationsStatus === "ready" && applications.length === 0 && <p className="mt-5 text-sm text-muted-foreground">No applications registered yet.</p>}
        {applications.length > 0 && <div className="mt-5 space-y-2">{applications.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm"><span><strong>{item.name}</strong> <code className="ml-2 text-xs text-muted-foreground">{item.slug}</code></span><span className="text-xs text-muted-foreground">{item.public ? "Public showcase opt-in" : "Private"}</span></div>)}</div>}
      </section>

      {message && <p role="status" className="md:col-span-2 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">{message}</p>}
      <button type="button" onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } })} className="md:col-span-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:underline">Sign out</button>
    </div>
  )
}
