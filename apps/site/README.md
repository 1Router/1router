# 1Router Site (`apps/site`)

The Next.js application for the 1Router catalog, chat experience, account
surface, and managed-service control plane.

## Authentication

1Router uses [Better Auth](https://better-auth.com) for authentication and
account management:

- passwordless magic-link sign-in and sign-up;
- optional Google and GitHub OAuth sign-in;
- sessions stored in PostgreSQL;
- organizations and membership roles;
- user-owned API keys through the Better Auth API Key plugin;
- a server-side `/api/chat` proxy that accepts a Better Auth session or API key.

The auth handler is mounted at `/api/auth/[...all]`. The generated API key
is never sent to the Rust gateway: the Next.js server authenticates the caller
and uses the private `ROUTER_API_KEY` only for the internal site-to-gateway hop.
When `ROUTER_IDENTITY_SECRET` is configured on
both services, the proxy also signs a five-minute identity assertion. The
Rust gateway verifies that assertion without accessing PostgreSQL. The usage
ledger records authenticated proxy requests in PostgreSQL, and an optional
per-user daily request quota can reserve capacity before forwarding a request;
per-key/org quotas and spend controls are the next slice.

### Database requirement

The site requires PostgreSQL for Better Auth. This is intentional: the same
persistence contract works in both deployment modes without maintaining two
incompatible schemas. The checked-in Compose file publishes the database on
host port `5433` by default (PostgreSQL still listens on `5432` inside the
container), which avoids collisions with another local Postgres container.

- **Self-hosted:** run PostgreSQL yourself and set `DATABASE_URL`.
- **Managed:** provide a managed PostgreSQL instance and set `DATABASE_URL` in
  the site deployment.

For a reproducible local bootstrap, start PostgreSQL and run the checked-in
bootstrap command:

```bash
docker compose -f docker-compose.self-hosted.yml up -d postgres
# apps/site/.env.local uses localhost:5433 by default.
# Bootstrap uses host psql when installed, otherwise psql inside the running container.
DATABASE_URL=postgres://postgres:postgres@localhost:5433/onerouter \
  bun run --cwd apps/site auth:bootstrap
```

The script generates the schema from the current Better Auth config into a
temporary file and applies it with `psql`; no generated SQL is committed because
plugin changes can alter the schema. It then runs the checked-in, versioned
operator migrations for `router_usage` and `router_quota_reservations`. For
production, run `DATABASE_URL=... bun run --cwd apps/site app:migrate` as a
one-shot migration job before starting the site. The direct Better Auth
commands remain available as `auth:generate` and `auth:migrate`. The application
migration includes the public application showcase schema; if the homepage
reports that the showcase is not initialized, run `bun run --cwd apps/site app:migrate`.

## Billing

Stripe Billing is an optional managed-service integration. When all of these
variables are present, Better Auth enables hosted Stripe Checkout, subscription
state synchronization, and the Stripe customer portal:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
```

The webhook endpoint is:

```text
https://your-domain.example/api/auth/stripe/webhook
```

Stripe is not required for self-hosting. Leave the Stripe variables unset and
self-hosted deployments retain authentication, organizations, and API-key
management without a Stripe account or Stripe network dependency.

## Environment variables

Copy `.env.example` and configure:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes for auth | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes for auth | 32+ character high-entropy secret |
| `BETTER_AUTH_URL` | Yes for auth | Canonical site URL |
| `TRUSTED_ORIGINS` | Recommended | Comma-separated trusted origins |
| `RESEND_API_KEY` | Magic links | Server-side Resend API key |
| `RESEND_EMAIL_FROM` | Magic links | Verified sender, e.g. `1Router <auth@example.com>` |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | Optional | Set `true` to show Google sign-in |
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth client secret |
| `NEXT_PUBLIC_GITHUB_AUTH_ENABLED` | Optional | Set `true` to show GitHub sign-in |
| `AUTH_REQUIRED` | Managed: yes | Require a Better Auth session/API key for `/api/chat` |
| `ROUTER_API_URL` | Optional | Rust gateway URL; defaults to `https://api.1router.com` outside the local `bun run dev` workflow |
| `ROUTER_API_KEY` | Yes | Private site-to-gateway master key |
| `ROUTER_USER_API_KEY` | Client-side only | The Better Auth user key generated in `/account`; never put this in the site server environment |
| `ROUTER_IDENTITY_SECRET` | Recommended | Shared HMAC secret for the signed user identity assertion |
| `CHAT_RATE_LIMIT_PER_MINUTE` | Optional | Temporary per-process proxy request limit |
| `ROUTER_REQUESTS_PER_DAY` | Optional | Durable authenticated-user request quota; `0` means unlimited |
| `X-1Router-Application` | Optional per request | Registered application slug used for explicit usage attribution |
| `STRIPE_SECRET_KEY` | Managed only | Stripe server secret |
| `STRIPE_WEBHOOK_SECRET` | Managed only | Stripe endpoint signing secret |
| `STRIPE_PRICE_ID` | Managed only | Managed plan recurring Price ID |

No secret should use a `NEXT_PUBLIC_` prefix.

### Passwordless auth setup

1. Create a Resend account, verify the sending domain/address, and set
   `RESEND_API_KEY` and `RESEND_EMAIL_FROM`. Magic links expire after 10 minutes
   and are single-use.
2. For Google, register `http://localhost:3000/api/auth/callback/google` locally
   and `https://your-domain.example/api/auth/callback/google` in production.
3. For GitHub, register the matching `/api/auth/callback/github` callback URL
   and grant the app access to the user's email address.
4. Password authentication is intentionally disabled; users sign in through a
   magic link or an enabled social provider.

## Usage ledger

The site proxy records authenticated requests in `router_usage` after the
response is available. Non-streaming responses use the returned `usage` object;
streaming responses inspect the final SSE usage chunk when the provider emits
one. If a client cancels a stream, the reservation is released without writing
a completed usage row. Ledger failures are logged and never interrupt the model
response.

Authenticated users can query their own recent records at `GET /api/usage` or
view them on `/account`. The endpoint is scoped by the Better Auth user ID and
never accepts an arbitrary identity from the request. The ledger currently covers authenticated requests through the Next.js proxy;
direct Rust gateway clients and anonymous demo traffic are intentionally not
recorded in the public aggregates. Model rankings read verified successful
records from `/api/rankings`. Application showcase attribution is opt-in: owners
register an application under `/account`, send its slug in the
`X-1Router-Application` header, and only public applications appear at
`/api/applications/public`.
The bootstrap and application migration runner are idempotent. Add a new
numbered SQL migration for future changes to `router_usage` or
`router_quota_reservations`; do not edit an already-applied migration. Set
`ROUTER_REQUESTS_PER_DAY=0` for an
unlimited self-hosted deployment, or a positive integer to enforce a UTC-day
request quota for authenticated users. Active requests are reserved atomically
and expired reservations are cleaned up during reservation checks.

## Self-hosted versus managed

Self-hosters receive the complete source-available application and run the
site, Rust gateway, PostgreSQL, provider credentials, and observability in
their own infrastructure. Stripe is optional.

The managed service runs the same application with managed infrastructure,
preconfigured provider routing, Better Auth accounts, and Stripe Billing. The
managed deployment can set `AUTH_REQUIRED=true`, while a local self-hosted
demo can leave it false during initial setup.

## Development

From the repository root, the recommended one-command workflow is:

```bash
bun install
bun run dev
```

The root `dev` script starts Dockerized PostgreSQL on host port `5433`, waits
for it to become ready, runs the idempotent Better Auth/application bootstrap,
and then starts both the Next.js site and Rust gateway. Press `Ctrl-C` to stop
the site and gateway; the database container is intentionally left running so
future starts are fast.

Use these commands when you want individual services:

```bash
bun run dev:site
bun run dev:api
```

The site runs on
`http://localhost:3000`; the local `bun run dev` workflow runs the Rust gateway
at `http://localhost:3001`. Self-hosted and managed deployments default their
site proxy to `https://api.1router.com` unless `ROUTER_API_URL` is explicitly
set. For a self-hosted gateway, set `ROUTER_API_URL` to that gateway's URL and
use the matching `ROUTER_API_KEY`; the template's `router_sk_test` key is only
for the local full-stack development gateway.
