# 1Router — One Interface for All AI Models

1Router gives developers a single, OpenAI-compatible API for AI models, with
explicit provider routing, a self-hostable control plane, and an optional
managed service for teams that do not want to operate the infrastructure.

This repository is a monorepo containing the Next.js site/control plane, the
Rust gateway, and the shared model catalog.

## Monorepo layout

```text
.
├── apps/
│   ├── site/          Next.js site, Better Auth, account and billing control plane
│   └── api/           Rust/Axum OpenAI-compatible gateway
├── packages/
│   └── models/        Shared model catalog consumed by site and API
├── apps/site/.env.example
├── apps/site/k8s/     Site deployment
├── apps/api/k8s/      Rust gateway deployment
└── LICENSE            FSL-1.1-Apache-2.0
```

## Current status

The current release is a deployable alpha/MVP:

- `GET /healthz`, `GET /v1/models`, and `POST /v1/chat/completions` are
  implemented by the Rust gateway.
- The site provides model discovery, chat, documentation, and a same-origin
  streaming proxy.
- Better Auth is now the planned and implemented authentication foundation for
  site accounts, organizations, sessions, and user-owned API keys.
- Stripe Billing is an optional managed-service integration using hosted
  Checkout, subscription webhooks, and the customer portal.
- The Rust gateway still uses the server-level `ROUTER_API_KEY` for its internal
  hop, and now accepts an optional short-lived HMAC identity assertion from the
  site proxy. The site control plane records authenticated request usage in
  PostgreSQL and can enforce a durable per-user daily request quota; spend
  controls and organization scope are the next slice.

## Authentication and billing architecture

```text
Browser / OpenAI SDK
        │ session cookie or Better Auth API key
        ▼
Next.js site control plane
  Better Auth + PostgreSQL
  optional Stripe Billing
        │ private ROUTER_API_KEY + signed identity assertion
        ▼
Rust gateway
  master-key auth + identity verification
  provider routing + streaming
        │ provider credentials
        ▼
OpenAI / Anthropic / Google / compatible providers
```

### Better Auth

The site uses [Better Auth](https://better-auth.com) with PostgreSQL for:

- email/password authentication;
- sessions and account lifecycle;
- organizations and membership roles;
- user-owned API keys;
- server-side authentication of the site chat/API proxy.

Auth routes are mounted at `/api/auth/[...all]`. Configure the site with
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`TRUSTED_ORIGINS`. See [`apps/site/README.md`](apps/site/README.md).

### Stripe Billing

[Stripe Billing](https://docs.stripe.com) is enabled only when the managed
service supplies `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`STRIPE_PRICE_ID`. Better Auth's Stripe plugin handles hosted Checkout,
subscription state, webhook verification, and the customer portal.

Self-hosted users can leave all Stripe variables unset. Their deployment still
supports Better Auth, organizations, and API-key management while billing and
Stripe webhooks remain disabled.

## Deployment modes

### Self-hosted

Run the site, Rust gateway, PostgreSQL, model-provider credentials, and
monitoring in your own infrastructure. No 1Router account or Stripe account is
required. Start with:

```bash
cp apps/site/.env.example apps/site/.env.local
# Set the site values in apps/site/.env.local.
bun install
set -a; source apps/site/.env.local; set +a
bun run dev:site
# In a second shell, export gateway values and start the Rust service.
export ROUTER_API_KEY=router_sk_test ROUTER_IDENTITY_SECRET=$(openssl rand -hex 32)
export OPENAI_API_KEY=sk-...
BIND_ADDR=0.0.0.0:3001 bun run dev:api
```

For production, use the Dockerfiles and Kubernetes manifests under
`apps/site/` and `apps/api/`. Start a local PostgreSQL instance with
`docker compose -f docker-compose.self-hosted.yml up -d postgres`, then apply
Better Auth's generated schema with `bun run --cwd apps/site auth:bootstrap`.
Review the generated SQL, then run the versioned application migration job with
`DATABASE_URL=... bun run --cwd apps/site app:migrate` before starting the site.

### Managed service

The managed deployment runs the same site and gateway with managed PostgreSQL,
`AUTH_REQUIRED=true`, configured provider pools, observability, and Stripe
Billing. Users sign up at the site, create API keys, subscribe through Stripe
Checkout, and manage payment methods through the Stripe customer portal.

The managed service is an operational offering; it is not required to run the
source-available project yourself.

## Workspace tooling

- Package manager: [Bun](https://bun.sh) workspaces.
- Build orchestration: [Turborepo](https://turbo.build).
- Rust builds: Cargo workspace under `apps/api`.

```bash
bun install
bun run dev:site
bun run dev:api
bun run build
bun run lint
```

## Roadmap

1. Add per-key/org scope, distributed rate limiting, token budgets, and spend
   controls around the authenticated usage ledger.
2. Add provider health checks, retries, weighted routing, and failover.
3. Add true Anthropic/Google SSE translation, tool calling, and embeddings.
4. Add managed-service operational controls, invoices/usage views, alerts, and
   enterprise SSO.

## License

Released under **FSL-1.1-Apache-2.0** — see [`LICENSE`](./LICENSE).
