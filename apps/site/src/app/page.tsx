import type { Metadata } from "next"
import Link from "next/link"
import { MessageSquare, ArrowRight, Zap, DollarSign, Globe, Server, Shield, GitBranch, Cloud } from "lucide-react"
import { AppShowcase } from "@/components/app-showcase"
import { TrendingModels } from "@/components/trending-models"
import { models, providers } from "@1router/models"

export const metadata: Metadata = {
  title: { absolute: '1Router — One Interface for All AI Models' },
  description: 'Access and compare all AI models through a single, unified, OpenAI-compatible API. Better prices, better uptime, no subscription. Self-hostable and open source.',
  alternates: {
    canonical: '/',
  },
}

const stats = [
  { label: "Models", value: `${models.length}+`, icon: Zap },
  { label: "Providers", value: `${providers.length}+`, icon: Globe },
  { label: "No subscription", value: "Pay-as-you-go", icon: DollarSign },
]

const selfHostFeatures = [
  {
    icon: Server,
    title: "Full Control",
    description: "Run the entire control plane on your own infrastructure. No data leaves your network.",
  },
  {
    icon: Shield,
    title: "Privacy First",
    description: "Your API keys, your usage data, your rules. Complete data sovereignty at every layer.",
  },
  {
    icon: GitBranch,
    title: "Open Source",
    description: "Fully open-source codebase. Fork it, extend it, contribute back — no vendor lock-in.",
  },
  {
    icon: Cloud,
    title: "Cloud or Self-Hosted",
    description: "Use our managed cloud for zero setup, or deploy on your own K8s cluster with one command.",
  },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Gradient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="container relative py-24 text-center md:py-32">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">All systems operational</span>
          </div>

          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            One Interface for{" "}
            <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              all AI models
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Better prices, better uptime, no subscription. Access every model through a single, OpenAI-compatible API.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
            >
              <MessageSquare className="h-4 w-4" />
              Start Chatting
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              Browse Models
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 flex max-w-2xl flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                  <stat.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TrendingModels />

      {/* Self-Hosting Section */}
      <section className="relative overflow-hidden border-y border-border/60 bg-secondary/20">
        <div className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-1.5 text-sm font-medium text-primary">
              <Server className="h-4 w-4" />
              Self-Hostable
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your control plane, your rules
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              1Router is fully open-source and self-hostable. Deploy the entire routing control plane on your own infrastructure — or use our managed cloud. Your choice.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/self-host"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
              >
                <Server className="h-4 w-4" />
                Self-Host Guide
              </Link>
              <Link
                href="https://github.com/1router/1router"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                <GitBranch className="h-4 w-4" />
                View on GitHub
              </Link>
            </div>
          </div>

          {/* Feature grid */}
          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
            {selfHostFeatures.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AppShowcase />
    </>
  )
}
