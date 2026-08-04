"use client"

import { useEffect, useState } from "react"
import { ExternalLink, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { name: "Today", period: "today" },
  { name: "This Week", period: "week" },
  { name: "This Month", period: "month" },
] as const

type Period = (typeof tabs)[number]["period"]

type PublicApplication = {
  id: string
  slug: string
  name: string
  description: string
  websiteUrl: string | null
  tokens: { today: number; week: number; month: number }
  requests: { today: number; week: number; month: number }
}

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`
  return value.toLocaleString()
}

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A"
}

export function AppShowcase() {
  const [activeTab, setActiveTab] = useState<Period>("today")
  const [apps, setApps] = useState<PublicApplication[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [reportingNote, setReportingNote] = useState("")

  async function loadApplications(signal?: AbortSignal) {
    try {
      const response = await fetch("/api/applications/public", { signal })
      const payload = await response.json().catch(() => null) as { data?: PublicApplication[]; reportingNote?: string } | null
      if (!response.ok) {
        setReportingNote(payload?.reportingNote || "The public application database is temporarily unavailable.")
        setStatus("error")
        return
      }
      setApps((payload?.data || []).filter((app) => app.tokens.today > 0 || app.tokens.week > 0 || app.tokens.month > 0))
      setReportingNote(payload?.reportingNote || "")
      setStatus("ready")
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") return
      setReportingNote("The public application showcase could not be reached. Try again shortly.")
      setStatus("error")
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetch("/api/applications/public", { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null) as { data?: PublicApplication[]; reportingNote?: string } | null
        if (!response.ok) throw new Error(payload?.reportingNote || "The public application showcase is temporarily unavailable.")
        return payload
      })
      .then((payload) => {
        setApps((payload?.data || []).filter((app) => app.tokens.today > 0 || app.tokens.week > 0 || app.tokens.month > 0))
        setReportingNote(payload?.reportingNote || "")
        setStatus("ready")
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setReportingNote(error instanceof Error ? error.message : "The public application showcase could not be reached. Try again shortly.")
        setStatus("error")
      })
    return () => controller.abort()
  }, [])

  return (
    <section className="py-20">
      <div className="container">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">App Showcase</h2>
            <p className="mt-1 text-sm text-muted-foreground">Public applications that opted in to share verified 1Router usage.</p>
          </div>
        </div>

        <div className="mb-6 rounded-lg border border-border/60 bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
          {status === "loading" && <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Loading public applications…</span>}
          {status === "error" && <span>{reportingNote || "The public application showcase is temporarily unavailable."} <button type="button" onClick={() => { setStatus("loading"); void loadApplications() }} className="ml-2 font-semibold text-primary underline-offset-2 hover:underline">Retry</button></span>}
          {status === "ready" && (reportingNote || "Only explicitly registered and active public applications appear here. No client headers are used to guess app identity.")}
        </div>

        {status === "ready" && apps.length > 0 && (
          <>
            <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 p-1">
              {tabs.map((tab) => (
                <button key={tab.period} type="button" onClick={() => setActiveTab(tab.period)} className={cn("min-h-[44px] rounded-md px-4 py-2.5 text-sm font-medium transition-all", activeTab === tab.period ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                  {tab.name}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              {apps.map((app, index) => {
                const row = (
                  <div className="group flex min-w-0 flex-1 items-center gap-4">
                    <span className="w-6 shrink-0 text-right text-sm font-medium text-muted-foreground">{index + 1}</span>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{initials(app.name)}</div>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium leading-tight transition-colors group-hover:text-primary">{app.name}</h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground sm:line-clamp-1">{app.description || "Public 1Router application"}</p>
                    </div>
                  </div>
                )
                const content = <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">{row}<div className="text-right sm:shrink-0"><div className="font-semibold">{formatTokens(app.tokens[activeTab])}</div><div className="text-xs text-muted-foreground">tokens · {app.requests[activeTab].toLocaleString()} requests</div></div></div>
                return app.websiteUrl ? <a key={app.id} href={app.websiteUrl} target="_blank" rel="noreferrer" className="group flex rounded-xl border border-transparent p-4 transition-all hover:border-border/60 hover:bg-secondary/40">{content}<ExternalLink className="ml-3 hidden h-4 w-4 shrink-0 text-muted-foreground group-hover:block" /></a> : <div key={app.id} className="group flex rounded-xl border border-transparent p-4 transition-all hover:border-border/60 hover:bg-secondary/40">{content}</div>
              })}
            </div>
          </>
        )}

        {status === "ready" && apps.length === 0 && <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center"><h3 className="text-lg font-semibold">No public applications yet</h3><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Application owners can register a project, send requests with the X-1Router-Application header, and opt in to this showcase. We only display apps with recorded activity and never infer app identity from User-Agent or Referer.</p></div>}
        {status === "error" && <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center"><h3 className="text-lg font-semibold">Showcase unavailable</h3><p className="mt-2 text-sm text-muted-foreground">{reportingNote || "The usage database could not be queried."}</p><button type="button" onClick={() => { setStatus("loading"); void loadApplications() }} className="mt-4 min-h-[44px] rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary">Retry</button></div>}
      </div>
    </section>
  )
}
