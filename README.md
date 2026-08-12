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
  PostgreSQL, serves verified model rankings, supports explicit opt-in app
  attribution, and can enforce a durable per-user daily request quota; spend
  controls and organization scope are now enforced through durable Postgres
  policies, rate-limit buckets, token/spend reservations, and budget alerts;
  managed accounts also expose monthly usage statements and enterprise OIDC
  sign-in when configured.

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

- passwordless magic-link authentication;
- optional Google and GitHub OAuth;
- sessions and account lifecycle;
- organizations and membership roles;
- user-owned API keys;
- server-side authentication of the site chat/API proxy.

Auth routes are mounted at `/api/auth/[...all]`. Configure the site with
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and
`TRUSTED_ORIGINS`. Configure `RESEND_API_KEY` and `RESEND_EMAIL_FROM` for
magic-link delivery, plus optional Google/GitHub OAuth credentials. See
[`apps/site/README.md`](apps/site/README.md).

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
# Self-host deployments default to https://api.1router.com; local bun run dev uses the local Rust API.
bun install
# Starts Dockerized Postgres, bootstraps Better Auth, then runs site + API.
bun run dev
# Set provider keys in your shell before running it, for example:
# export OPENAI_API_KEY=sk-...
```

For production, use the Dockerfiles and Kubernetes manifests under
`apps/site/` and `apps/api/`. Start a local PostgreSQL instance with
`docker compose -f docker-compose.self-hosted.yml up -d postgres` (it publishes host port 5433 by default), then apply
Better Auth's generated schema with `bun run --cwd apps/site auth:bootstrap`.
Review the generated SQL, then run the versioned application migration job with
`DATABASE_URL=... bun run --cwd apps/site app:migrate` before starting the site.

### Local PostgreSQL troubleshooting

The self-hosted compose file intentionally publishes PostgreSQL on host port
`5433` (container port remains `5432`) so it can coexist with another local
PostgreSQL installation or container already using `5432`:

```bash
docker compose -f docker-compose.self-hosted.yml up -d postgres
# apps/site/.env.local should use:
# DATABASE_URL=postgres://postgres:postgres@localhost:5433/onerouter
set -a; source apps/site/.env.local; set +a
# Uses host psql when installed, otherwise psql inside the running Postgres container.
bun run --cwd apps/site auth:bootstrap
```

If you have already created the 1Router volume with different credentials,
changing `POSTGRES_PASSWORD` does not change that existing database. Stop and
remove only the 1Router service/volume if it contains no data you need, then
start it again:

```bash
docker compose -f docker-compose.self-hosted.yml down -v
```

Do not run `down -v` against a shared or production Compose project. The
existing unrelated `nomad-postgres` container on host port `5432` is not the
1Router database and should not be modified by the 1Router setup.

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
bun run dev       # Postgres + Better Auth bootstrap + site + Rust API
bun run dev:site  # site only
bun run dev:api   # Rust API only
# Production/self-host proxy default: https://api.1router.com

bun run build
bun run lint
```

## Roadmap

1. Extend the new durable per-user/API-key/organization controls with policy
   inheritance, richer invoice exports, and organization-owned key management.
2. Add provider health checks, retries, weighted routing, and failover.
3. Add true Anthropic/Google SSE translation, tool calling, and embeddings.
4. Add managed-service invoice synchronization, delivery channels for alerts,
   and SAML in addition to the current enterprise OIDC flow.

## License

Released under **FSL-1.1-Apache-2.0** — see [`LICENSE`](./LICENSE).
