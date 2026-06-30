import type { Metadata } from "next"
import Link from "next/link"
import { Server, Shield, GitBranch, Terminal, Cloud, Lock, Cpu, Database } from "lucide-react"

export const metadata: Metadata = {
  title: 'Self-Hosting',
  description: 'Run 1Router on your own infrastructure. Source-available under FSL-1.1 with an irrevocable grant of Apache 2.0 after two years; deployable with Docker or Kubernetes in minutes. Complete data sovereignty.',
  openGraph: {
    title: 'Self-Hosting Guide — 1Router',
    description: 'Run 1Router on your own infrastructure. Source-available under FSL-1.1-Apache-2.0, deployable in minutes.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Self-Hosting Guide — 1Router',
    description: 'Run 1Router on your own infrastructure. Source-available under FSL-1.1-Apache-2.0, deployable in minutes.',
  },
}

const steps = [
  {
    num: "1",
    title: "Clone the repository",
    command: "git clone https://github.com/1router/1router-frontend.git\ncd 1router-frontend",
  },
  {
    num: "2",
    title: "Configure your providers",
    command: "# Set your API keys in .env\nOPENAI_API_KEY=sk-...\nANTHROPIC_API_KEY=sk-ant-...\nGOOGLE_API_KEY=AI...",
  },
  {
    num: "3",
    title: "Deploy with Docker",
    command: "docker build -t 1router .\ndocker run -p 3000:3000 --env-file .env 1router",
  },
  {
    num: "4",
    title: "Or deploy to Kubernetes",
    command: "kubectl apply -f k8s/\n# Namespace, Deployment, Service, and Ingress\n# are all included in the k8s/ directory",
  },
]

const features = [
  { icon: Server, title: "Full Control Plane", description: "Run the entire routing layer — model selection, load balancing, fallbacks, and rate limiting — on your own hardware." },
  { icon: Shield, title: "Data Sovereignty", description: "No telemetry, no analytics sent home. Your usage patterns and API keys never leave your infrastructure." },
  { icon: Lock, title: "Private Network", description: "Deploy behind your VPN or firewall. Restrict access with your own auth layer, SSO, or IP allowlists." },
  { icon: Cpu, title: "Custom Models", description: "Add your own fine-tuned models, local LLMs via Ollama, or private endpoints alongside hosted providers." },
  { icon: Database, title: "Your Own Storage", description: "Use your own Postgres, Redis, or SQLite for usage tracking and billing. No external dependencies." },
  { icon: GitBranch, title: "Open License", description: "Released under FSL-1.1-Apache-2.0 with a guaranteed, irrevocable conversion to plain Apache 2.0 two years after each release. Use, modify, and self-host freely for internal, research, and educational purposes — full Apache 2.0 rights arrive on the two-year anniversary of every release." },
]

const architecture = [
  { layer: "Client", desc: "OpenAI-compatible API requests", tech: "Any HTTP client / SDK" },
  { layer: "1Router Control Plane", desc: "Routing, load balancing, rate limiting, fallbacks", tech: "Next.js + Node.js" },
  { layer: "Provider Adapters", desc: "Translate requests to provider-specific formats", tech: "OpenAI, Anthropic, Google, etc." },
  { layer: "Your Infrastructure", desc: "Storage, auth, monitoring", tech: "Postgres, Redis, Prometheus" },
]

export default function SelfHostPage() {
  return (
    <div className="container py-12">
      {/* Hero */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium text-primary">
          <Server className="h-4 w-4" />
          Self-Hosting
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Run 1Router on your own infrastructure
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          The entire control plane is source-available and self-hostable. Deploy in minutes with Docker or Kubernetes — no vendor lock-in, no data leaving your network, and a guaranteed conversion to Apache 2.0 for every release.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="https://github.com/1router/1router-frontend"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-xl hover:shadow-primary/30 hover:brightness-110"
          >
            <GitBranch className="h-4 w-4" />
            View on GitHub
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            Read the Docs
          </Link>
        </div>
      </div>

      {/* Quick Start */}
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">Quick Start</h2>
        <div className="space-y-6">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {step.num}
              </div>
              <div className="flex-1">
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-4 py-2">
                    <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">bash</span>
                  </div>
                  <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
                    <code className="text-foreground">{step.command}</code>
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="mt-20">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Why Self-Host?</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="mt-20 mx-auto max-w-3xl">
        <h2 className="mb-8 text-2xl font-bold tracking-tight">Architecture</h2>
        <div className="space-y-2">
          {architecture.map((item, i) => (
            <div key={item.layer}>
              <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{item.layer}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
                <span className="hidden sm:block rounded-md bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  {item.tech}
                </span>
              </div>
              {i < architecture.length - 1 && (
                <div className="ml-10 h-4 w-px bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Cloud vs Self-Host comparison */}
      <div className="mt-20 mx-auto max-w-3xl">
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">Cloud or Self-Hosted?</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Cloud className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">1Router Cloud</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Zero infrastructure to manage</li>
              <li>✓ Automatic updates and new models</li>
              <li>✓ Built-in monitoring and analytics</li>
              <li>✓ Global edge deployment</li>
              <li>✓ Pay-as-you-go pricing</li>
            </ul>
          </div>
          <div className="rounded-xl border-2 border-primary/30 bg-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Server className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Self-Hosted</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>✓ Complete data sovereignty</li>
              <li>✓ No per-token fees — just your provider costs</li>
              <li>✓ Custom models and private endpoints</li>
              <li>✓ Full control over routing logic</li>
              <li>✓ Deploy behind your firewall</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
