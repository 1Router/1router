# 1Router API (`apps/api`)

The backend that powers **api.1router.com** and provides OpenAI-compatible routing to upstream AI model providers.

This crate is currently a **scaffold** — no real proxying yet, just enough surface to validate deployment, observability, and the shared catalog boundary with `packages/models`.

## What it does today

| Route             | Purpose                                                  |
| ----------------- | -------------------------------------------------------- |
| `GET /healthz`    | Liveness/readiness probe.                                |
| `GET /v1/models`  | Returns the supported model catalog (loaded from the shared `packages/models/models.json`). |
| CORS              | Permissive by default; tighten before going public.      |

Bind address is controlled via the `BIND_ADDR` env var, defaulting to `0.0.0.0:3000`.

## What it will do (roadmap)

This scaffold is a deliberate placeholder. Production work is sequenced under:

1. **OpenAI-compatible proxy**
   - `/v1/chat/completions` (streaming + non-streaming)
   - `/v1/embeddings`
   - `/v1/models` (already wired)
2. **Provider pool + credentialing**
   - Credentials stored per provider, rotated out of band.
   - Failover and weighted routing across the pool.
   - Per-environment toggles (`dev` / `staging` / `prod`).
3. **Per-provider data-handling attestations** (driven from `packages/models`)
   - For each upstream we wire, surface a `dataPolicy` block (`noLog`, `retainPrompts`, `trainOnInputs`, `evalShareOptOut`, `documentedAt`).
   - The site will display this on each model page so users can verify upstreams before sending traffic.
4. **Auth + rate limiting + usage metering**
   - API-key auth, per-key rate limits, per-key spend caps.
   - Postgres-backed usage log for billing.

## Running locally

```bash
# from repo root
bun run dev:api
# or directly
cd apps/api && cargo run
```

`cargo run` defaults `BIND_ADDR=0.0.0.0:3000` and `RUST_LOG=info`.

## Building for production

```bash
cargo build --release --manifest-path apps/api/Cargo.toml
# or via the workspace helper:
bun run build:api
```

The release binary will land at `apps/api/target/release/api` and is what the
Dockerfile installs as `/usr/local/bin/api`.

A multi-stage `Dockerfile` lives at `apps/api/Dockerfile` and produces a small distroless-style image.

## How it shares the catalog with the site

The catalog is `packages/models/models.json` at the repo root of the `models` package. Both:

- the **site** (`apps/site`) imports it through the TS module `@1router/models`, and
- the **API** (`apps/api`) embeds it into the binary via `include_str!` at compile time.

This guarantees the API and the site never disagree on which models are supported.

## License

Released under **FSL-1.1-Apache-2.0** — see `/LICENSE` at the repo root.
