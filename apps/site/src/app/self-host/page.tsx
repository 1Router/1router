import type { Metadata } from "next"
import Link from "next/link"
import { Server, Shield, GitBranch, Terminal, Lock, Cpu, Database } from "lucide-react"

export const metadata: Metadata = {
  title: 'Self-Hosting',
  description: 'Run the 1Router control plane, Better Auth, PostgreSQL, and Rust gateway on your own infrastructure. Stripe is optional.',
  openGraph: {
    title: 'Self-Hosting Guide — 1Router',
    description: 'Run 1Router with operator-owned storage, authentication, provider credentials, and monitoring.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Self-Hosting Guide — 1Router',
    description: 'Run 1Router with operator-owned storage, authentication, provider credentials, and monitoring.',
  },
}

const steps = [
  {
    num: "1",
    title: "Clone the repository",
    command: "git clone https://github.com/1router/1router.git\ncd 1router",
  },
  {
    num: "2",
    title: "Configure storage, auth, and providers",
    command: "cp apps/site/.env.example apps/site/.env.local\n# Set site values in apps/site/.env.local.\n# ROUTER_API_URL defaults to https://api.1router.com.\n# bun run dev overrides it to the local Rust API at http://localhost:3001.\n# In the gateway shell, export ROUTER_API_KEY, provider keys, and:\nexport ROUTER_IDENTITY_SECRET=$(openssl rand -hex 32)",
  },
  {
    num: "3",
    title: "Start everything locally",
    command: "# Set provider keys in your shell first, for example: export OPENAI_API_KEY=sk-...\nbun run dev\n# Starts Dockerized Postgres, bootstraps Better Auth, and runs site + local API.",
  },
  {
    num: "4",
    title: "Run services individually when needed",
    command: "bun run dev:site\n# In another terminal:\nbun run dev:api\n# The database can remain running from bun run dev.",
  },
  {
    num: "5",
    title: "Or deploy to Kubernetes",
    command: "kubectl apply -f apps/api/k8s/\nkubectl apply -f apps/site/k8s/\n# Create site-secrets and api-secrets out-of-band.",
  },
]

const features = [
  { icon: Server, title: "Full Control Plane", description: "Run routing, Better Auth accounts, organizations, API keys, rate limiting, and provider credentials on your own hardware." },
  { icon: Shield, title: "Data Sovereignty", description: "No telemetry, no analytics, and no Stripe dependency. Your PostgreSQL database, API keys, prompts, and logs stay in your infrastructure." },
  { icon: Lock, title: "Private Network", description: "Deploy behind your VPN or firewall. Restrict access with Better Auth, your own SSO, or IP allowlists." },
  { icon: Cpu, title: "Custom Models", description: "Add fine-tuned models, local LLMs via Ollama, or private endpoints alongside hosted providers." },
  { icon: Database, title: "Your Own Storage", description: "Use your own PostgreSQL for Better Auth, usage history, and optional daily quotas. Stripe is optional and can remain disabled." },
  { icon: GitBranch, title: "Open License", description: "Released under FSL-1.1-Apache-2.0. Use, modify, and self-host for permitted internal, research, and educational purposes." },
]

const architecture = [
  { layer: "Client", desc: "OpenAI-compatible API requests or browser session", tech: "Any HTTP client / SDK" },
  { layer: "Next.js Control Plane", desc: "Better Auth, organizations, API keys, signed identity assertions, optional Stripe", tech: "Next.js + PostgreSQL" },
  { layer: "Rust Gateway", desc: "Master-key auth, identity verification, provider routing, and streaming", tech: "Axum + Tokio" },
  { layer: "Your Infrastructure", desc: "Database, credentials, monitoring, and ingress", tech: "Postgres / Prometheus / K8s" },
]

export default function SelfHostPage() {
  return (
    <div className="container py-12">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium text-primary">
          <Server className="h-4 w-4" />
          Self-Hosting
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Run 1Router on your own infrastructure
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Operate the site, Better Auth, PostgreSQL, Rust gateway, provider credentials, and monitoring yourself. Stripe is optional and managed-service-only.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="https://github.com/1router/1router" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110">
            <GitBranch className="h-4 w-4" />
            View on GitHub
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary">
            Read the Docs
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">Quick Start</h2>
        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.num} className="flex min-w-0 gap-4 sm:gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{step.num}</div>
              <div className="min-w-0 flex-1">
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
                  <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-4 py-2"><Terminal className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs text-muted-foreground">bash</span></div>
                  <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin"><code className="text-foreground">{step.command}</code></pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Why Self-Host?</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><feature.icon className="h-5 w-5 text-primary" /></div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">Architecture</h2>
        <div className="space-y-2">
          {architecture.map((item, i) => (
            <div key={item.layer}>
              <div className="flex min-w-0 items-center gap-4 rounded-xl border border-border/60 bg-card p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{i + 1}</div>
                <div className="min-w-0 flex-1"><h3 className="font-semibold">{item.layer}</h3><p className="text-sm text-muted-foreground">{item.desc}</p></div>
                <span className="hidden rounded-md bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground sm:block">{item.tech}</span>
              </div>
              {i < architecture.length - 1 && <div className="ml-10 h-4 w-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-20 max-w-3xl rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <h2 className="text-2xl font-bold">Want zero operations?</h2>
        <p className="mt-3 text-muted-foreground">Use the managed service for hosted PostgreSQL, Better Auth, Stripe billing, provider routing, monitoring, and updates. The self-hosted path remains available with no Stripe dependency.</p>
        <Link href="/pricing" className="mt-6 inline-flex items-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Compare deployment modes</Link>
      </div>
    </div>
  )
}
