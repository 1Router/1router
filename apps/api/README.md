# 1Router API (`apps/api`)

The Rust/Axum backend that routes OpenAI-compatible requests to upstream AI
providers. It is designed to run as the gateway in both self-hosted and managed
1Router deployments.

## Current routes

| Route | Auth | Status |
| --- | --- | --- |
| `GET /healthz` | Public | ✅ Liveness probe |
| `GET /healthz/providers` | Bearer `ROUTER_API_KEY` | ✅ Passive provider health/cooldowns |
| `GET /metrics` | Bearer `ROUTER_API_KEY` | ✅ Prometheus-compatible gateway counters |
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
making the Rust gateway connect to that database. The site proxy reserves
request, token, spend, concurrency, and rate-limit capacity before forwarding
traffic; these controls are persisted in PostgreSQL and shared across site
replicas.

## Providers

Provider credentials remain server-side environment variables. Supported
provider adapters include OpenAI-compatible providers, Anthropic, Google,
xAI, DeepSeek, Qwen, Mistral, Groq, Perplexity, NVIDIA NIM, MiniMax, Moonshot,
StepFun, Z.ai, ByteDance Ark, Upstage, Abacus.AI, Sarvam AI, Azure OpenAI,
and operator-configured OpenAI-compatible deployments. The gateway routes
only to configured provider APIs; it does not depend on another aggregator or
silently proxy unsupported catalog entries through one. The shared `/v1/models`
catalog also contains NVIDIA embeddings, rerankers, audio/video services, and
other NIMs for discovery; the currently implemented gateway route is
`/v1/chat/completions`, so those non-chat entries require dedicated endpoints
before they can be called through 1Router.

Anthropic and Google use their native SSE endpoints when streaming is
requested. The gateway translates text, finish reasons, usage, and initial tool
call deltas into the OpenAI-compatible chunk format. Native provider endpoints
and complete cross-provider tool semantics remain separate roadmap work.

## Self-hosting

Self-hosters can run this gateway without the managed service or Stripe:

```bash
export ROUTER_API_KEY=router_sk_test
export ROUTER_IDENTITY_SECRET=$(openssl rand -hex 32)
export OPENAI_API_KEY=sk-...
# NVIDIA NIM uses https://integrate.api.nvidia.com/v1 and its own key.
export NVIDIA_API_KEY=nvapi-...
# Optional direct providers use their own *_API_KEY environment variables.
# Azure requires AZURE_OPENAI_ENDPOINT and optionally AZURE_OPENAI_API_VERSION.
BIND_ADDR=0.0.0.0:3001 cargo run --manifest-path apps/api/Cargo.toml

```

The gateway can be deployed with Docker or Kubernetes. Provider credentials,
including `NVIDIA_API_KEY` for NVIDIA-hosted NIM models, `ROUTER_API_KEY`, CORS
origins, and storage/observability are owned by the operator.

Set `ROUTER_MAX_RETRIES` to a bounded value (default `2`). Optional weighted
logical-model deployments are configured with `ROUTER_DEPLOYMENTS_JSON`, for
example:

```json
{"nvidia/muse-glimmer-30b":[{"providerSlug":"nvidia","upstreamModel":"meta/muse-glimmer-30b","weight":90},{"providerSlug":"nvidia","upstreamModel":"nvidia/nemotron-3-super-120b-a12b","weight":10}]}
```

The gateway tracks response latency and retryable failures in memory, applies
exponential cooldowns, and exposes the current passive health state at
`/healthz/providers` (using the private gateway key). Metrics are available at
`/metrics` with the same authentication. Configure Prometheus or another
collector to send `Authorization: Bearer $ROUTER_API_KEY`; `/healthz` remains
public for liveness probes. This state is intentionally local to each gateway
replica; deployment-level health aggregation remains a control-plane concern.

## Managed service

The managed service runs the same gateway behind the Next.js control plane.
Managed mode adds Better Auth accounts, managed PostgreSQL, Stripe Billing,
provider pools, usage accounting, and production rate limits around the
otherwise self-hostable gateway.

## Roadmap

- [x] Verify a short-lived site-signed identity without exposing the auth database
- [x] Site-side authenticated usage ledger with token/status metadata
- [x] Durable per-user daily request quota in the site control plane
- [x] Per-key/org scope, distributed rate limiting, token budgets, and spend controls
- [x] Provider passive health, bounded retries, failover, and weighted routing
- [x] True native SSE streaming for Anthropic and Google
- [x] Initial tool-call streaming translation for Anthropic and Google
- [ ] `POST /v1/embeddings`
- [ ] Per-provider data-handling attestations

## License

Released under **FSL-1.1-Apache-2.0** — see `/LICENSE` at the repository root.
