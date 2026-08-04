# 1Router API (`apps/api`)

The Rust/Axum backend that routes OpenAI-compatible requests to upstream AI
providers. It is designed to run as the gateway in both self-hosted and managed
1Router deployments.

## Current routes

| Route | Auth | Status |
| --- | --- | --- |
| `GET /healthz` | Public | ✅ Liveness probe |
| `GET /v1/models` | Public | ✅ Embedded shared catalog |
| `POST /v1/chat/completions` | Bearer `ROUTER_API_KEY` | ✅ Streaming and non-streaming proxy |

The site control plane authenticates browser/API callers with Better Auth and
then uses the private server-to-server `ROUTER_API_KEY` to call this gateway.
The Rust gateway does not connect directly to the site PostgreSQL database.
That boundary keeps the gateway independently self-hostable and avoids making
Rust depend on the TypeScript auth runtime.

## Authentication boundary

Today the gateway validates one server-level master key:

```text
Authorization: Bearer router_sk_...
```

The key is SHA-256 hashed at startup and compared in constant time. The site
proxy never forwards a user's Better Auth API key upstream.

When `ROUTER_IDENTITY_SECRET` is configured, the site proxy adds three
short-lived headers (`X-1Router-Identity`, timestamp, and HMAC-SHA-256
signature). The gateway verifies them after the master key and exposes the
verified identity to handlers through request extensions. It never connects to
Better Auth or PostgreSQL. Requests without identity headers remain compatible
with direct self-hosted gateway clients.

The site control plane now records authenticated usage in PostgreSQL without
making the Rust gateway connect to that database. The site proxy can also
reserve an optional per-user daily request quota before forwarding traffic;
per-key/org quotas and spend limits remain control-plane roadmap work.

## Providers

Provider credentials remain server-side environment variables. Supported
provider adapters include OpenAI-compatible providers, Anthropic, Google,
xAI, DeepSeek, Qwen, Mistral, Groq, Perplexity, NVIDIA NIM, and OpenRouter.
When routing through OpenRouter, optional attribution can be configured with
`OPENROUTER_HTTP_REFERER`, `OPENROUTER_TITLE`, and
`OPENROUTER_CATEGORIES`; these are sent as OpenRouter's `HTTP-Referer`,
`X-OpenRouter-Title`, and `X-OpenRouter-Categories` headers.

Anthropic and Google currently use a fake-stream compatibility fallback: the
full upstream response is collected and emitted as one OpenAI-shaped SSE chunk.
True format-preserving streaming and complete tool calling remain roadmap work.

## Self-hosting

Self-hosters can run this gateway without the managed service or Stripe:

```bash
export ROUTER_API_KEY=router_sk_test
export ROUTER_IDENTITY_SECRET=$(openssl rand -hex 32)
export OPENAI_API_KEY=sk-...
BIND_ADDR=0.0.0.0:3001 cargo run --manifest-path apps/api/Cargo.toml
```

The gateway can be deployed with Docker or Kubernetes. Provider credentials,
`ROUTER_API_KEY`, CORS origins, and storage/observability are owned by the
operator.

## Managed service

The managed service runs the same gateway behind the Next.js control plane.
Managed mode adds Better Auth accounts, managed PostgreSQL, Stripe Billing,
provider pools, usage accounting, and production rate limits around the
otherwise self-hostable gateway.

## Roadmap

- [x] Verify a short-lived site-signed identity without exposing the auth database
- [x] Site-side authenticated usage ledger with token/status metadata
- [x] Durable per-user daily request quota in the site control plane
- [ ] Per-key/org scope, distributed rate limiting, token budgets, and spend controls
- [ ] Provider health checks, retries, failover, and weighted routing
- [ ] True SSE streaming for Anthropic and Google
- [ ] Tool calling support for Anthropic and Google
- [ ] `POST /v1/embeddings`
- [ ] Per-provider data-handling attestations

## License

Released under **FSL-1.1-Apache-2.0** — see `/LICENSE` at the repository root.
