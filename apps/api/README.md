# 1Router API (`apps/api`)

The backend that powers **api.1router.com** — an OpenAI-compatible API
gateway that routes requests to upstream AI model providers.

## Architecture

The API is a **2-crate Cargo workspace** following the pattern pioneered
by LiteLLM's Rust port: a pure translation layer and a separate I/O layer.

```
apps/api/
├── Cargo.toml              # workspace root
├── Dockerfile              # multi-stage build (cache-friendly)
├── k8s/                    # Kubernetes manifests (deployment, service, ingress)
└── crates/
    ├── core/               # onerouter-core — pure translation (no network)
    │   ├── Cargo.toml
    │   ├── build.rs        # copies shared models.json into the binary
    │   └── src/
    │       ├── lib.rs
    │       ├── catalog.rs      # embedded model catalog (from packages/models)
    │       ├── error.rs        # CoreError + CoreResult
    │       ├── types.rs        # OpenAI-format request/response types
    │       ├── constants.rs    # timeouts, SSE prefixes, route paths
    │       ├── router/         # model id → provider config resolution
    │       ├── chat/           # ChatProviderConfig trait
    │       │   └── transformation.rs
    │       └── providers/      # per-provider implementations
    │           ├── mod.rs          # dispatch: providerSlug → config
    │           ├── openai.rs       # OpenAI + 8 OpenAI-compatible providers
    │           ├── anthropic.rs    # Anthropic Messages API
    │           ├── google.rs       # Google Gemini API
    │           └── xai.rs          # xAI (Grok)
    │
    └── gateway/            # onerouter-gateway — Axum HTTP server (I/O only)
        ├── Cargo.toml
        └── src/
            ├── main.rs         # entry point, tracing, server startup
            ├── state.rs        # AppState (catalog + HTTP client)
            ├── auth/           # constant-time Bearer auth (SHA-256 hashed)
            ├── routes/         # /healthz, /v1/models, /v1/chat/completions
            │   ├── mod.rs
            │   ├── health.rs
            │   ├── models.rs
            │   └── chat.rs     # the core proxy handler
            └── io/             # reserved for future WebSocket/realtime
```

### Design principles (from LiteLLM)

- **Core is pure** — no network, no env, no filesystem. Only types, traits,
  and translation logic. This makes it unit-testable without mocking HTTP.
- **Gateway is I/O** — the only crate that touches the network. It calls
  methods on `&dyn ChatProviderConfig` from core; it never knows provider
  specifics.
- **Adding a provider = adding one file** — implement the
  `ChatProviderConfig` trait, add a match arm in `providers/mod.rs`. The
  gateway doesn't change.

## What's implemented

| Route | Auth | Status |
|-------|------|--------|
| `GET /healthz` | Public | ✅ Liveness probe |
| `GET /v1/models` | Public | ✅ Returns embedded catalog |
| `POST /v1/chat/completions` | Bearer token | ✅ Proxy with streaming + non-streaming |

### Supported providers

| Provider | Config | Streaming | Notes |
|----------|--------|-----------|-------|
| OpenAI | Native | ✅ SSE pass-through | Reference implementation |
| Anthropic | Native transform | Fake-stream* | System msg extraction, stop reason mapping |
| Google (Gemini) | Native transform | Fake-stream* | URL-based model routing, systemInstruction |
| xAI (Grok) | OpenAI-compatible | ✅ SSE pass-through | |
| DeepSeek | OpenAI-compatible | ✅ SSE pass-through | |
| Qwen (DashScope) | OpenAI-compatible | ✅ SSE pass-through | |
| Mistral | OpenAI-compatible | ✅ SSE pass-through | |
| Groq (Meta, Nous) | OpenAI-compatible | ✅ SSE pass-through | |
| Perplexity | OpenAI-compatible | ✅ SSE pass-through | |
| NVIDIA NIM | OpenAI-compatible | ✅ SSE pass-through | |
| OpenRouter (catch-all) | OpenAI-compatible | ✅ SSE pass-through | For less-common providers |

\* *Fake-stream = collects the full upstream response, then emits it as a
single SSE chunk + `[DONE]`. True streaming for Anthropic/Google is a TODO
(theirs SSE format differs from OpenAI's).*

## Authentication

The gateway uses a single master API key (`ROUTER_API_KEY` env var).
Requests to `/v1/chat/completions` must include:

```
Authorization: Bearer router_sk_...
```

Auth is **fail-closed**: if no key is configured, all authenticated
requests are rejected. Keys are SHA-256 hashed before constant-time
comparison so they never appear in plaintext in memory or logs.

## Running locally

```bash
# from repo root
BIND_ADDR=0.0.0.0:3001 bun run dev:api
# or directly
cd apps/api && BIND_ADDR=0.0.0.0:3001 cargo run

# set required env vars
export ROUTER_API_KEY=router_sk_test
export OPENAI_API_KEY=sk-...
```

## Building for production

```bash
cargo build --release --manifest-path apps/api/Cargo.toml
# or via the workspace helper:
bun run build:api
```

The release binary lands at `apps/api/target/release/api`.

## Docker

```bash
# build context must be repo root (for shared catalog access)
docker build -f apps/api/Dockerfile -t 1router-api .
docker run --rm -p 3001:3001 \
  -e RUST_LOG=info \
  -e ROUTER_API_KEY=router_sk_... \
  -e OPENAI_API_KEY=sk-... \
  1router-api
```

## Kubernetes

Manifests are in `apps/api/k8s/`:

```bash
kubectl apply -f apps/api/k8s/

# create secrets out-of-band (not in git!):
kubectl create secret generic api-secrets \
  --namespace=1router \
  --from-literal=router-api-key='router_sk_...' \
  --from-literal=openai-api-key='sk-...' \
  --from-literal=anthropic-api-key='sk-ant-...'
```

The ingress is configured for `api.1router.com` with SSE-friendly nginx
annotations (`proxy-buffering: false`, `proxy-read-timeout: 300`).

## How it shares the catalog with the site

The catalog is `packages/models/models.json` at the repo root. Both:

- the **site** imports it through the TS module `@1router/models`, and
- the **API** embeds it into the binary via `include_str!` at compile time
  (the `build.rs` in `crates/core` copies it before compilation).

This guarantees the API and the site never disagree on which models exist.

## Roadmap

- [ ] True SSE streaming for Anthropic + Google (format translation)
- [ ] Tool calling support for Anthropic (tool use response blocks)
- [ ] `POST /v1/embeddings`
- [ ] Per-key rate limiting + usage metering (Postgres)
- [ ] Failover + weighted routing across provider pools
- [ ] Per-provider data-handling attestations (`packages/models/providers.json`)

## License

Released under **FSL-1.1-Apache-2.0** — see `/LICENSE` at the repo root.
