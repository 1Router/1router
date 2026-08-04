import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Key, Webhook } from "lucide-react"

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'Full OpenAI-compatible REST API reference for 1Router. Endpoints, parameters, authentication, and code examples for chat completions, embeddings, and usage.',
  openGraph: {
    title: 'API Reference — 1Router',
    description: 'Full OpenAI-compatible REST API reference for 1Router.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'API Reference — 1Router',
    description: 'Full OpenAI-compatible REST API reference for 1Router.',
  },
}

const endpoints = [
  {
    method: "POST",
    path: "/api/v1/chat/completions",
    status: "available",
    description: "Create a chat completion with any model",
    params: [
      { name: "model", type: "string", required: true, desc: "Model ID, e.g. openai/gpt-4o" },
      { name: "messages", type: "array", required: true, desc: "Array of message objects" },
      { name: "temperature", type: "number", required: false, desc: "0–2, default 1" },
      { name: "max_tokens", type: "integer", required: false, desc: "Max output tokens" },
      { name: "stream", type: "boolean", required: false, desc: "Stream response via SSE" },
      { name: "response_format", type: "object", required: false, desc: "JSON mode: { type: \"json_object\" }" },
    ],
  },
  {
    method: "POST",
    path: "/v1/completions",
    status: "roadmap",
    description: "Legacy text completions (planned; chat completions are available now)",
    params: [
      { name: "model", type: "string", required: true, desc: "Model ID" },
      { name: "prompt", type: "string", required: true, desc: "Input text" },
      { name: "max_tokens", type: "integer", required: false, desc: "Max output tokens" },
    ],
  },
  {
    method: "GET",
    path: "/api/v1/models",
    status: "available",
    description: "List all available models",
    params: [],
  },
  {
    method: "POST",
    path: "/api/v1/embeddings",
    status: "roadmap",
    description: "Generate text embeddings (planned)",
    params: [
      { name: "model", type: "string", required: true, desc: "Embedding model ID" },
      { name: "input", type: "string", required: true, desc: "Text to embed" },
    ],
  },
  {
    method: "GET",
    path: "/api/usage",
    status: "available",
    description: "Recent usage for the authenticated Better Auth user (same-origin control-plane route)",
    params: [
      { name: "limit", type: "integer", required: false, desc: "Number of records to return, capped at 100" },
    ],
  },
]

const methodColors: Record<string, string> = {
  GET: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  POST: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
}

export default function ApiReferencePage() {
  return (
    <div className="container py-12">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-4 py-1.5 text-sm font-medium text-primary">
          <Webhook className="h-4 w-4" />
          API Reference
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          OpenAI-Compatible REST API
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Site proxy base URL: <code className="break-all rounded bg-secondary px-2 py-0.5 text-sm font-mono">https://your-site.example/api</code>
        </p>
      </div>

      {/* Authentication */}
      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Key className="h-6 w-6 text-primary" />
          Authentication
        </h2>
        <div className="rounded-xl border border-border/60 bg-card p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Site proxy requests require a Better Auth session or user API key in the <code className="break-all rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">Authorization</code> header. The proxy forwards only its private gateway key. Direct gateway deployments instead require the server-level <code className="break-all rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">ROUTER_API_KEY</code>. Usage history is available at <code className="break-all rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">/api/usage</code> for authenticated users.
          </p>
          <div className="rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
            <pre className="overflow-x-auto p-4 text-sm font-mono scrollbar-thin">
              <code className="text-foreground">Authorization: Bearer router_user_...</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Endpoints</h2>
        <div className="space-y-6">
          {endpoints.map((endpoint) => (
            <div key={`${endpoint.method}-${endpoint.path}`} className="rounded-xl border border-border/60 bg-card overflow-hidden">
              {/* Header */}
              <div className="flex min-w-0 flex-wrap items-center gap-3 border-b border-border/60 bg-secondary/30 p-4">
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${methodColors[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="min-w-0 break-all text-sm font-mono font-medium">{endpoint.path}</code>
                {endpoint.status === "roadmap" && (
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                    Roadmap
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="p-4">
                <p className="mb-4 text-sm text-muted-foreground">{endpoint.description}</p>

                {endpoint.params.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-[34rem] w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Parameter</th>
                          <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Type</th>
                          <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Required</th>
                          <th className="py-2 text-left font-medium text-muted-foreground">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        {endpoint.params.map((param) => (
                          <tr key={param.name} className="border-b border-border/40 last:border-0">
                            <td className="py-2.5 pr-4 font-mono text-xs font-medium">{param.name}</td>
                            <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">{param.type}</td>
                            <td className="py-2.5 pr-4">
                              {param.required ? (
                                <span className="rounded-md bg-red-500/10 px-1.5 py-0.5 text-xs font-medium text-red-500">Yes</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No</span>
                              )}
                            </td>
                            <td className="py-2.5 text-muted-foreground">{param.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Example request/response */}
      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Example</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="border-b border-border/60 bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
              Request
            </div>
            <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
              <code className="text-foreground">{`POST /api/v1/chat/completions
Authorization: Bearer router_user_...

{
  "model": "openai/gpt-4o",
  "messages": [
    {"role": "user", "content": "Hi"}
  ]
}`}</code>
            </pre>
          </div>
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="border-b border-border/60 bg-secondary/30 px-4 py-2 text-xs font-semibold text-muted-foreground">
              Response (200)
            </div>
            <pre className="overflow-x-auto p-4 text-sm font-mono leading-relaxed scrollbar-thin">
              <code className="text-foreground">{`{
  "id": "chatcmpl_abc123",
  "model": "openai/gpt-4o",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 8,
    "completion_tokens": 7,
    "total_tokens": 15
  }
}`}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mx-auto mt-16 max-w-2xl text-center">
        <Link
          href="/docs"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          Back to Docs
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
