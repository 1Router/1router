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
    path: "/v1/chat/completions",
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
    description: "Create a text completion (legacy)",
    params: [
      { name: "model", type: "string", required: true, desc: "Model ID" },
      { name: "prompt", type: "string", required: true, desc: "Input text" },
      { name: "max_tokens", type: "integer", required: false, desc: "Max output tokens" },
    ],
  },
  {
    method: "GET",
    path: "/v1/models",
    description: "List all available models",
    params: [],
  },
  {
    method: "POST",
    path: "/v1/embeddings",
    description: "Generate text embeddings",
    params: [
      { name: "model", type: "string", required: true, desc: "Embedding model ID" },
      { name: "input", type: "string", required: true, desc: "Text to embed" },
    ],
  },
  {
    method: "GET",
    path: "/v1/usage",
    description: "Get usage statistics for your API key",
    params: [
      { name: "start_date", type: "string", required: false, desc: "ISO 8601 date" },
      { name: "end_date", type: "string", required: false, desc: "ISO 8601 date" },
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
          Base URL: <code className="rounded bg-secondary px-2 py-0.5 text-sm font-mono">https://api.1router.com/v1</code>
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
            All requests require a Bearer token in the <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-mono">Authorization</code> header.
            Get your API key from the dashboard.
          </p>
          <div className="rounded-lg border border-border/60 bg-secondary/30 overflow-hidden">
            <pre className="overflow-x-auto p-4 text-sm font-mono scrollbar-thin">
              <code className="text-foreground">Authorization: Bearer router_sk_...</code>
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
              <div className="flex items-center gap-3 border-b border-border/60 bg-secondary/30 p-4">
                <span className={`rounded-md px-2.5 py-1 text-xs font-bold ${methodColors[endpoint.method]}`}>
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono font-medium">{endpoint.path}</code>
              </div>

              {/* Description */}
              <div className="p-4">
                <p className="mb-4 text-sm text-muted-foreground">{endpoint.description}</p>

                {endpoint.params.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
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
              <code className="text-foreground">{`POST /v1/chat/completions
Authorization: Bearer router_sk_...

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
