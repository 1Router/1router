"use client"

import { useState } from "react"
import { authClient } from "@/lib/auth-client"

export function AccountActions({ billingEnabled }: { billingEnabled: boolean }) {
  const [keyName, setKeyName] = useState("default")
  const [createdKey, setCreatedKey] = useState("")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)

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
        <p className="mt-2 text-sm text-muted-foreground">
          Generate a personal key for the OpenAI-compatible API. Keys are owned by your Better Auth account.
        </p>
        <label className="mt-5 block text-sm font-medium">
          Key name
          <input
            value={keyName}
            onChange={(event) => setKeyName(event.target.value)}
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <button
          type="button"
          onClick={createKey}
          disabled={pending || !keyName.trim()}
          className="mt-4 h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          Create API key
        </button>
        {createdKey && (
          <code className="mt-4 block break-all rounded-lg bg-secondary p-3 text-xs">{createdKey}</code>
        )}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card p-6">
        <h2 className="text-lg font-semibold">Managed billing</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {billingEnabled
            ? "Manage the optional Stripe subscription for the 1Router managed service."
            : "Stripe billing is disabled on this self-hosted deployment. You own the infrastructure and provider relationships directly."}
        </p>
        {billingEnabled && (
          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={startSubscription}
              disabled={pending}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              Start managed plan
            </button>
            <button
              type="button"
              onClick={openPortal}
              disabled={pending}
              className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-secondary disabled:opacity-60"
            >
              Open billing portal
            </button>
          </div>
        )}

      </section>

      {message && <p className="md:col-span-2 rounded-lg bg-secondary px-4 py-3 text-sm text-muted-foreground">{message}</p>}

      <button
        type="button"
        onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => window.location.assign("/") } })}
        className="md:col-span-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
      >
        Sign out
      </button>
    </div>
  )
}
