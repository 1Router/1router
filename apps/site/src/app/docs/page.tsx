import type { Metadata } from "next"
import Link from "next/link"
import { Book, Terminal, Code, Server, Zap, Globe, ArrowRight } from "lucide-react"

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Build with 1Router — a single, OpenAI-compatible API for every AI model. Quickstart guides, code examples, and key concepts.',
  openGraph: {
    title: 'Documentation — 1Router',
    description: 'Build with 1Router — a single, OpenAI-compatible API for every AI model.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Documentation — 1Router',
    description: 'Build with 1Router — a single, OpenAI-compatible API for every AI model.',
  },
}

const sections = [
  {
    icon: Zap,
    title: "Quickstart",
    description: "Make your first API call in under 5 minutes.",
    href: "#quickstart",
  },
  {
    icon: Code,
    title: "API Reference",
    description: "Full OpenAI-compatible API documentation.",
    href: "/api-reference",
  },
  {
    icon: Server,
    title: "Self-Hosting",
    description: "Deploy 1Router on your own infrastructure.",
    href: "/self-host",
  },
  {
    icon: Globe,
    title: "Providers",
    description: "Configure and manage model providers.",
    href: "#providers",
  },
]

const codeExamples = {
  curl: `curl https://api.1router.com/v1/chat/completions \\
  -H "Authorization: Bearer $ROUTER_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
  python: `from openai import OpenAI

client = OpenAI(
    base_url="https://api.1router.com/v1",
    api_key=os.environ["ROUTER_API_KEY"]
)

response = client.chat.completions.create(
    model="openai/gpt-4o",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)`,
  javascript: `import OpenAI from "openai"

const client = new OpenAI({
  baseURL: "https://api.1router.com/v1",
  apiKey: process.env.ROUTER_API_KEY,
})

const response = await client.chat.completions.create({
  model: "openai/gpt-4o",
  messages: [{ role: "user", content: "Hello!" }],
})
console.log(response.choices[0].message.content)`,
}

export default function DocsPage() {
  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium text-primary">
          <Book className="h-4 w-4" />
          Documentation
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Build with 1Router
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A single, OpenAI-compatible API for every model. Drop-in replacement — just change the base URL.
        </p>
      </div>

      {/* Topic cards */}
      <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <section.icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold group-hover:text-primary">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
            </div>
            <ArrowRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      {/* Quickstart */}
      <div id="quickstart" className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Terminal className="h-6 w-6 text-primary" />
          Quickstart
        </h2>
        <p className="mb-6 text-muted-foreground">
          1Router is fully OpenAI-compatible. Point your existing SDK at our API and it just works.
        </p>

        <div className="space-y-6">
          {/* cURL */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-4 py-2">
              <span className="text-xs font-semibold text-muted-foreground">cURL</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
              <code className="text-foreground">{codeExamples.curl}</code>
            </pre>
          </div>

          {/* Python */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-4 py-2">
              <span className="text-xs font-semibold text-muted-foreground">Python (openai SDK)</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
              <code className="text-foreground">{codeExamples.python}</code>
            </pre>
          </div>

          {/* JavaScript */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/60 bg-secondary/30 px-4 py-2">
              <span className="text-xs font-semibold text-muted-foreground">JavaScript / TypeScript</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
              <code className="text-foreground">{codeExamples.javascript}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Key concepts */}
      <div id="providers" className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Key Concepts</h2>
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-2 font-semibold">Model Routing</h3>
            <p className="text-sm text-muted-foreground">
              1Router automatically routes requests to the best provider based on latency, price, and availability.
              Specify a model by <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">{"provider/model-name"}</code> or use
              smart routing with <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">{"1router/auto"}</code> to let us pick.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-2 font-semibold">Fallbacks</h3>
            <p className="text-sm text-muted-foreground">
              Configure fallback models so if a provider is down, requests automatically retry on the next best option.
              No code changes needed — set it once in your dashboard.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-2 font-semibold">Rate Limiting</h3>
            <p className="text-sm text-muted-foreground">
              Set per-key rate limits, per-model quotas, and spending caps. Protect your budget and prevent runaway costs.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-20 max-w-2xl rounded-2xl border border-border/60 bg-secondary/20 p-8 text-center">
        <h3 className="text-xl font-bold">Ready to start building?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Get your API key and make your first call in minutes.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/chat"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get API Key
          </Link>
          <Link
            href="/api-reference"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
          >
            API Reference
          </Link>
        </div>
      </div>
    </div>
  )
}
