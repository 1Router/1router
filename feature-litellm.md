# LiteLLM Feature Comparison and 1Router Priorities

> **Purpose:** A practical backlog for deciding which LiteLLM capabilities 1Router should implement, defer, or deliberately not pursue.
>
> **Reference reviewed:** `ref/`, a LiteLLM source checkout containing the SDK, AI Gateway/proxy, dashboard, deployment modules, and enterprise-oriented subsystems. The reference snapshot has roughly 132 directories under `litellm/llms/` and 52 proxy capability directories; the first number is a raw package-directory count, not a guarantee that every directory is a distinct provider. LiteLLM is much broader than a single gateway: it combines a Python SDK, provider adapter library, gateway, admin product, and enterprise platform.
>
> **Status date:** August 2026

## Executive summary

1Router should **not attempt to reproduce all of LiteLLM**. LiteLLM has a large surface area accumulated around provider breadth, Python SDK compatibility, enterprise gateway administration, and every adjacent LLM modality.

Our product is narrower and more focused:

- a fast Rust gateway;
- an OpenAI-compatible API;
- explicit model/provider routing;
- a self-hostable control plane;
- a managed service with Better Auth and Stripe;
- useful usage, quota, and billing controls for teams.

The most important LiteLLM ideas for 1Router are the ones that make a gateway **safe and reliable in production**, not every endpoint LiteLLM exposes. The first priority is tenant-aware authorization, cost enforcement, distributed rate limiting, routing resilience, and operational visibility. Provider and endpoint breadth should follow a stable gateway core.

### Scope and priority caveat

This comparison primarily targets LiteLLM's **AI Gateway/proxy**. LiteLLM's Python SDK, its large provider adapter library, dashboard, deployment modules, and commercial enterprise features are separate surfaces. The priority labels below are for 1Router's product strategy: a P0 item means a managed-service launch priority, not that every single-node self-hosted installation must deploy Redis, Stripe, or an admin cluster. A self-host can reasonably run a reduced P0 subset with Postgres and one gateway node.

## Priority definitions

| Priority | Meaning |
| --- | --- |
| **P0** | Required for a trustworthy managed service or a serious self-hosted production deployment. |
| **P1** | High-value product capability after the core gateway is safe; likely differentiating or necessary for adoption. |
| **P2** | Valuable expansion, but not required for the first reliable product. |
| **P3** | Optional, specialized, enterprise-only, or outside 1Router's primary product focus. |
| **Defer** | Do not implement until there is validated demand or a clear product reason. |

### Implementation status

- **Shipped:** Meaningful implementation exists in this repository.
- **Partial:** Some related behavior exists, but it is incomplete or not production-grade.
- **Planned:** Explicitly present in the current roadmap/docs.
- **Missing:** No meaningful implementation found in the current 1Router codebase.
- **Not core:** LiteLLM capability that is intentionally outside the current product boundary.

## P0 — production gateway foundation

These are the capabilities LiteLLM provides that map directly to the risks already identified in 1Router.

| LiteLLM capability | LiteLLM reference areas | 1Router status | Priority | Recommendation |
| --- | --- | --- | --- | --- |
| **Virtual/API keys** | `proxy/auth/`, `management_endpoints/key_management_endpoints.py`, verification-token models | Better Auth user API keys and `/api/v1` authentication are shipped; keys currently resolve to a user identity | **P0** | Add key lifecycle management, revocation/listing, last-used metadata, hashed/rotated secrets, and organization ownership. |
| **Users, teams, organizations** | `management_endpoints/team_endpoints.py`, internal-user endpoints, Prisma schema/repositories | Better Auth users and organizations are present; quota/usage remains user-scoped | **P0** | Make organization/team the billing and quota boundary. Keep personal keys as a supported child scope. |
| **Per-key/team/user budgets** | `max_budget_limiter.py`, budget management endpoints, budget reset jobs | Durable per-user request-count quota only; no token or dollar budgets | **P0** | Implement preflight reservations and post-response settlement for tokens and estimated cost. Enforce hard ceilings before provider calls. |
| **Spend tracking and cost attribution** | `spend_tracking/`, cost calculator, spend logs, async DB writer | Usage ledger stores status, duration, and token metadata; Stripe subscription exists but usage metering is not wired | **P0** | Add model-price cost calculation, immutable usage events, aggregation, reconciliation, and Stripe meter reporting. |
| **Distributed rate limiting** | Redis/DualCache, `parallel_request_limiter`, dynamic rate limiter | Temporary in-memory per-process limiter | **P0** | Use Redis or a carefully designed Postgres fallback for RPM, TPM, concurrency, and tenant limits. |
| **Retries, fallbacks, cooldowns** | `router.py`, `router_strategy/`, deployment cooldowns, fallback budget logic | Explicit model resolves to one configured provider; no provider retry/failover | **P0** | Add bounded retry policy, retry classification, deployment health/cooldowns, fallback chains, and idempotency safeguards. |
| **Health/readiness/liveness** | `health_endpoints/`, health-check managers, background health checks | Gateway `/healthz` and Kubernetes probes exist; provider health state does not | **P0** | Add dependency health, provider health, route health, and readiness semantics without making health checks trigger customer spend. |
| **Operational audit logs** | audit-log helpers, logging endpoints, spend logs | Basic server logs and usage rows | **P0** | Record authentication, key, organization, policy, routing, billing, and admin mutations with retention controls. |
| **Error normalization** | LiteLLM exception mapping and OpenAI-compatible error handling | OpenAI-compatible gateway errors exist; transformed provider errors are still narrower | **P0** | Preserve safe provider error metadata, normalize retryability, and return stable request IDs/error types. |
| **Timeouts, cancellation, backpressure, graceful shutdown** | request timeout handling, streaming handlers, shutdown managers | Basic request signals and streaming exist; full deadline propagation/backpressure/shutdown behavior needs hardening | **P0** | Propagate deadlines to providers, cancel work on disconnect, bound buffers, and drain in-flight requests during shutdown. |
| **Request transformation and parameter normalization** | SDK provider transformations under `litellm/llms/{provider}/`, common request processing | Chat transformations exist for initial providers; tool/parameter coverage is incomplete | **P0** | Treat provider capability/parameter normalization as a first-class adapter contract. Reject unsupported parameters clearly instead of silently dropping them. |
| **Database migrations and background jobs** | Prisma migrations, APScheduler jobs, spend writer, budget reset | Versioned application migrations are shipped; no full scheduler/reconciliation layer | **P0** | Add durable jobs for usage settlement, Stripe reconciliation, cleanup, budget reset, health refresh, and key rotation. |
| **Secrets and credential rotation** | credential endpoints, provider key configuration, key rotation manager | Provider credentials are environment variables; deployment docs exist | **P0** | Keep env-only self-host mode, then add encrypted managed credential storage and rotation without exposing provider keys. |
| **Authentication modes and admin authorization** | API-key auth, JWT/OAuth handlers, custom auth hooks, admin RBAC, SSO/SCIM endpoints | Better Auth sessions/API keys and organizations are present; there are no organization-owned keys, project enforcement, custom gateway auth modes, or admin RBAC surface yet | **P0/P1** | Finish organization/project/key enforcement first. Add OIDC/SAML, JWT/custom auth, mTLS, and fine-grained admin roles only where managed or enterprise demand justifies them. |

### P0 exit criteria

Before positioning 1Router as a dependable managed gateway, one organization should be able to:

1. create and revoke a key;
2. assign it to an organization/project;
3. set request, token, concurrency, and dollar limits;
4. route through multiple provider deployments;
5. survive a provider timeout or rate limit with bounded failover;
6. see accurate usage and cost;
7. receive predictable behavior when billing fails;
8. inspect an audit trail; and
9. run the same controls across multiple site/gateway instances.

## Endpoint parity snapshot

This is the quick API-level view to keep the roadmap honest. LiteLLM exposes more provider-native and OpenAI-compatible routes than this table lists; these are the most relevant gateway surfaces for 1Router.

| Endpoint/capability | LiteLLM | 1Router today | Priority |
| --- | --- | --- | --- |
| `POST /v1/chat/completions` | Shipped | Shipped, including streaming | Core |
| `GET /v1/models` | Shipped | Shipped at the Rust gateway; authenticated site proxy exists | Core |
| `GET /v1/model/info` and `/v1/model_group_info` | Shipped | Missing | P1 |
| `GET /health`, `/health/liveliness`, `/health/readiness` | Shipped | `/healthz` exists; provider-aware readiness is missing | P0 |
| `POST /v1/messages` | Shipped | Missing; Anthropic is translated behind chat | P1 |
| `POST /v1/responses` | Shipped | Missing | P1 |
| `POST /v1/completions` | Shipped | Missing | P2 |
| `POST /v1/embeddings` | Shipped | Planned/missing | P1 |
| `POST /v1/rerank` | Shipped | Missing | P1/P2 |
| `POST /v1/images/generations` | Shipped | Missing | P2 |
| `POST /v1/audio/transcriptions` and `/v1/audio/speech` | Shipped | Missing | P2 |
| `POST /v1/batches` | Shipped | Missing | P2 |
| `POST /v1/files` | Shipped | Missing | P2 |
| `POST /v1/fine_tuning/*` | Shipped | Missing | P3 |
| `POST /v1/moderations` | Shipped | Missing | P2 |
| `POST /v1/vector_stores/*` | Shipped | Missing | P2 |
| MCP gateway and A2A agent routes | Shipped | Missing | P2/P3 |

## P1 — core gateway and developer-product expansion

| LiteLLM capability | LiteLLM reference areas | 1Router status | Priority | Recommendation |
| --- | --- | --- | --- | --- |
| **Provider breadth** | `litellm/llms/` provider adapters; provider docs/table | Initial OpenAI, Anthropic, Google, xAI and compatible providers | **P1** | Add providers through a stable adapter contract. Prioritize OpenAI-compatible/self-hosted, Azure, Bedrock, Vertex, Mistral, Cohere, Groq, OpenRouter, Ollama, and vLLM based on demand. Do not chase every provider. LiteLLM's full provider count is not a 1Router acceptance criterion. |
| **Model aliases and routing groups** | model groups, deployment config, alias handling | Shared catalog and explicit `provider/model` IDs | **P1** | Add stable logical model IDs mapped to weighted provider deployments, with versioned routing config. |
| **Load balancing strategies** | `router_strategy/` including shuffle/latency/cost strategies | Missing; one route per model | **P1** | Implement simple weighted routing first, then latency-aware and cost-aware strategies using measured telemetry. |
| **OpenAI Responses API** | `response_api_endpoints/` | Missing | **P1** | Add after chat semantics, tool calls, response IDs, and usage accounting are stable. |
| **Native Anthropic Messages API** | `anthropic_endpoints/` | Partial: chat translation and fake-stream fallback | **P1** | Support native `/v1/messages` and true streaming translation; retain OpenAI compatibility. |
| **True streaming translation** | provider streaming handlers and transformations | Passthrough streaming works; Anthropic/Google use fake-stream compatibility fallback | **P1** | Implement native provider event translation, cancellation propagation, usage trailers, and tool-call deltas. |
| **Tool calling** | provider transformations, MCP/tool paths | Partial request passthrough; translation is incomplete | **P1** | Normalize tool schemas/calls across major providers and persist tool-call usage/errors correctly. |
| **Embeddings and reranking** | `/v1/embeddings`, `rerank_endpoints/` | Embeddings planned; reranking missing | **P1** | Implement embeddings first because it unlocks RAG and vector search; add reranking as a separate endpoint contract. |
| **Observability integrations** | callbacks, `integrations/`, Prometheus/OpenTelemetry/Langfuse/etc. | Basic tracing/logging; no customer-selectable callback framework | **P1** | Emit OpenTelemetry metrics/traces and structured logs first; add webhooks/exporters without coupling the core to vendors. |
| **Admin and customer usage UI** | LiteLLM dashboard, analytics/spend endpoints | Account page shows recent usage and quota; no admin operations view | **P1** | Add organization usage, cost, limits, provider health, failed requests, and billing status dashboards. |
| **Caching** | `caching/`, Redis/DualCache, cache controls | Missing response cache | **P1** | Add opt-in, policy-aware response caching with tenant isolation, privacy controls, TTLs, invalidation, and no-cache semantics. Never cache by default for sensitive requests. |
| **Request/concurrency controls** | parallel request limiter, TPM/RPM tracking | Request-count quota and temporary per-process RPM limiter | **P1** | Add per-key concurrency, token-per-minute, queue depth, timeout, max input/output token, and payload-size controls. |
| **Configuration management** | proxy YAML, management/UI CRUD endpoints | Catalog/config compiled into gateway plus env configuration | **P1** | Add validated versioned routing configuration, safe reloads, and a self-host-friendly YAML/DB configuration path. |
| **Pass-through provider endpoints** | `pass_through_endpoints/` | Generic OpenAI-compatible path only | **P1** | Allow explicitly configured provider-native paths with strict auth, allowlists, timeouts, and cost-accounting boundaries. |
| **Files and retrieval primitives** | `openai_files_endpoints/`, vector stores, RAG/search endpoints | Missing | **P1/P2** | Add only after embeddings and tenant storage/security are ready. Start with files and embeddings, then retrieval. |

## P2 — adjacent AI platform capabilities

These are useful capabilities in LiteLLM, but they should follow the gateway foundation and core API compatibility work.

| LiteLLM capability | LiteLLM reference areas | 1Router status | Priority | Recommendation |
| --- | --- | --- | --- | --- |
| **Images** | `image_endpoints/` and image provider adapters | Missing | **P2** | Implement if 1Router becomes a multimodal platform. Use a separate capability model because image cost/latency semantics differ from tokens. |
| **Audio transcription and speech** | audio provider modules/endpoints | Missing | **P2** | Add after demand is proven; expose provider capability metadata and byte-size/duration billing. |
| **Video generation** | `video_endpoints/` | Missing | **P3** | Defer. Long-running jobs, object storage, asynchronous status, and expensive billing require a distinct product subsystem. |
| **Batch API** | `batches_endpoints/`, batch cost jobs | Missing | **P2** | Valuable for cost-sensitive workloads. Requires durable job queues, files, status polling, cancellation, and reconciliation. |
| **Fine-tuning** | `fine_tuning_endpoints/` | Missing | **P3** | Defer. Provider-specific jobs, artifact storage, permissions, and cost controls make this a separate platform. |
| **Moderations/content classification** | moderation endpoints/providers | Missing | **P2** | Add a policy/guardrail service first; expose a compatible moderation endpoint if customers need it. |
| **Rerank** | `rerank_endpoints/` | Missing | **P1** | Good RAG primitive, but lower priority than embeddings and tenant-safe usage accounting. |
| **Realtime/WebSocket** | `realtime_endpoints/` | Missing | **P2** | Add only with a clear voice/realtime use case; requires connection budgets, backpressure, and streaming cost accounting. |
| **OCR** | `ocr_endpoints/` | Missing | **P3** | Defer until document workflows are part of the product. |
| **Search tools** | `search_endpoints/` | Missing | **P2** | Prefer a provider-neutral tool interface or MCP integration rather than building a search product prematurely. |
| **Prompt management** | `prompts/` | Missing | **P2** | Add versioned prompt templates only if the control plane is becoming an application platform, not merely a gateway. |
| **Memory/workflows** | `memory/`, `workflows/` | Missing | **P3** | Not core to a routing gateway; integrate with external agent platforms instead. |
| **Evaluation endpoints** | `openai_evals_endpoints/` | Missing | **P3** | Defer until routing and usage data provide a stable evaluation substrate. |
| **Container/credential/discovery endpoints** | `container_endpoints/`, `credential_endpoints/`, discovery modules | Missing | **P2** | Add carefully for managed operations; keep dangerous infrastructure control out of the public API. |

## P2 — MCP and agent interoperability

LiteLLM now treats MCP and A2A as first-class gateway surfaces. These are strategically interesting for 1Router, but should not outrank billing safety and provider reliability.

| Capability | LiteLLM reference areas | 1Router status | Priority | Recommendation |
| --- | --- | --- | --- | --- |
| **MCP client/tool bridge** | MCP bridge in root README; MCP gateway directories/UI | Missing | **P2** | Implement an allowlisted MCP registry and tool normalization layer. Start with server configuration and tool discovery, not arbitrary user-supplied URLs. |
| **MCP gateway** | MCP routes, OAuth credential UI, MCP server management | Missing | **P2** | Add after tenant permissions, outbound network policy, secrets, audit logs, and tool-call cost attribution exist. |
| **A2A agent gateway** | `a2a/`, `agent_endpoints/`, agent registry/discovery | Missing | **P2/P3** | Add if agent-to-agent routing is a product differentiator. Otherwise integrate through generic HTTP/OpenAI-compatible endpoints. |
| **Agent/skill orchestration** | agent/workflow/skills modules | Missing | **P3** | Avoid building a general agent runtime inside the gateway. |

## P1/P2 — policy, guardrails, and governance

| LiteLLM capability | LiteLLM reference areas | 1Router status | Priority | Recommendation |
| --- | --- | --- | --- | --- |
| **Pre-call/post-call guardrails** | `guardrails/`, `custom_hooks/`, content-safety integrations | Missing | **P1** | Implement a provider-neutral policy hook contract. Start with token/payload limits, model allowlists, PII blocking, and configurable external guardrails. |
| **Policy engine** | `policy_engine/`, policy endpoints/condition evaluator | Missing | **P1** | Add tenant/model/provider policy evaluation before routing. This is more important than a large collection of vendor-specific guardrails. |
| **Model allow/deny lists** | auth checks, key/team model restrictions | Catalog exists; enforcement is incomplete | **P1** | Enforce allowed models/providers by organization, key, environment, and route. |
| **Audit/compliance reporting** | audit logs, compliance endpoints, governance modules | Missing | **P2** | Add after audit events and usage records have stable schemas. |
| **SCIM and enterprise SSO** | `management_endpoints/scim/`, SSO/JWT/OAuth modules | Better Auth foundation; no enterprise SSO/SCIM | **P2/P3** | Add managed enterprise SSO/SAML/OIDC and SCIM after core multi-tenancy is stable. Keep self-host deployments configurable. |
| **Data-handling controls** | guardrail/policy/configuration surfaces | Missing | **P1/P2** | Add provider-region/data-retention/model policy metadata, prompt logging controls, and tenant-specific redaction. |

## P1 — deployment and operations

LiteLLM's reference includes a substantial deployment story beyond the proxy binary. We should adopt the operational principles without copying every Terraform module.

| Capability | LiteLLM reference areas | 1Router status | Priority | Recommendation |
| --- | --- | --- | --- | --- |
| **Docker images** | Dockerfiles and release docs | Dockerfiles/build scripts exist | **P0** | Use immutable release tags and publish signed images; stop relying on `:main` for production rollback. |
| **Kubernetes** | Helm, Terraform, deployment modules | Kubernetes manifests exist; HA hardening remains TODO | **P0** | Add migration Job, replicas, PDB, HPA, anti-affinity, alerts, and dependency-aware probes. |
| **Managed Postgres + Redis** | Terraform AWS/GCP stacks, Prisma migrations | Postgres is documented; Redis not integrated | **P0/P1** | Managed mode needs Postgres, Redis, backups, restore drills, and secret management. Self-host mode should remain Postgres-only where possible. |
| **Versioned migrations** | Prisma migrations and one-off migration jobs | Application migrations are shipped | **P0** | Add deployment orchestration and rollback guidance; never make app startup race migrations. |
| **Background scheduler** | APScheduler jobs | Missing general scheduler | **P0** | Add a small explicit worker/job runner rather than embedding many jobs in every web process. |
| **Metrics and health** | Prometheus middleware, health managers, dashboards | Basic health/probes | **P0** | Add request, provider, queue, quota, cost, and billing metrics with bounded cardinality. |
| **Terraform/cloud modules** | `terraform/`, AWS/GCP modules | Missing | **P2** | Provide a clean Docker Compose path first, then Kubernetes examples, then Terraform only when managed architecture is settled. |
| **Release verification** | cosign docs and stable release tags | Build/push flow exists; mutable deployment tag remains | **P1** | Add signed immutable artifacts, SBOMs, provenance, and documented upgrade/rollback procedures. |

## P3 — capabilities we should probably not replicate

These exist in LiteLLM but are not automatically good 1Router priorities:

- A general-purpose **Python SDK**. 1Router's primary product is the gateway/API; clients can use OpenAI-compatible SDKs. A small typed Rust/TypeScript client may be enough.
- Every one of LiteLLM's **100+ provider adapters**. Prefer an adapter contract, OpenAI-compatible passthrough, and demand-driven providers.
- A general **agent runtime**, memory system, workflow engine, or skills injection framework.
- Fine-tuning orchestration, video workflows, OCR, and provider-specific job systems before the core gateway is profitable.
- A full enterprise control plane with every SCIM/SSO/compliance integration before the multi-tenant data model and audit log are correct.
- Vendor-specific dashboard screens that do not map to a stable 1Router product concept.

## Recommended implementation sequence

### Phase 0 — make the existing gateway safe

1. Organization/project/key identity model.
2. Key lifecycle: list, revoke, rotate, last-used, permissions.
3. Provider capability metadata and compatibility tests for every supported model/endpoint/parameter combination.
4. Token and dollar budget reservations/settlement.
5. Redis-backed distributed rate and concurrency limits.
6. Provider retry classification, health, cooldowns, and fallback chains.
7. Immutable usage/cost ledger plus reconciliation jobs.
8. OpenTelemetry/Prometheus metrics, request IDs, and audit events.
9. Production migrations, backups, HA manifests, and immutable releases.

### Phase 1 — become a strong OpenAI-compatible gateway

1. Stable logical model aliases and deployment groups.
2. Weighted, latency-aware, and cost-aware routing.
3. Native Anthropic Messages and true Anthropic/Google streaming.
4. Tool calling across the major providers.
5. Embeddings and rerank.
6. Policy hooks, model/provider allowlists, PII/redaction controls.
7. Customer/admin usage, cost, provider health, and billing dashboards.
8. Opt-in tenant-safe response caching.

### Phase 2 — expand the platform

1. MCP registry and guarded MCP gateway.
2. OpenAI Responses API.
3. Batch jobs and file storage.
4. Images, audio, realtime, and search based on customer demand.
5. Enterprise SSO/OIDC/SAML, SCIM, compliance exports.
6. Terraform modules and deeper cloud deployment automation.

### Phase 3 — selective advanced features

1. A2A agent gateway.
2. Vector stores and managed RAG primitives.
3. Fine-tuning and long-running provider jobs.
4. Video/OCR/evals/workflows.
5. A dedicated SDK only if gateway adoption shows it is necessary.

## Product decisions this comparison clarifies

### 1. 1Router should compete on operating simplicity, not feature count

LiteLLM's breadth is a strength, but it also creates configuration and operational complexity. 1Router can be valuable by offering a smaller, opinionated product with:

- Rust performance;
- a clean model catalog;
- self-hosting without a mandatory cloud dependency;
- a managed experience with Better Auth and Stripe;
- safer defaults around identity, spend, and provider failover.

### 2. Billing is not complete because Stripe Checkout exists

LiteLLM's spend pipeline makes the distinction clear: subscription state, provider cost calculation, usage aggregation, budgets, and payment enforcement are separate systems. 1Router must finish the usage-to-cost-to-Stripe path before claiming usage billing.

### 3. Provider support should be capability-driven

The catalog should advertise capabilities such as chat, native messages, streaming, tools, embeddings, image, audio, and batch. Routing must reject unsupported combinations cleanly rather than pretending every provider supports every OpenAI feature.

### 4. The control plane is the long-term differentiator

LiteLLM's admin UI and management APIs demonstrate that a gateway becomes a product when teams can manage keys, projects, budgets, policies, deployments, usage, and incidents. The next major 1Router work should therefore strengthen the control plane rather than only adding more provider adapters.

## Source map

Representative sources reviewed in `ref/`:

- `ref/README.md` — product feature index, endpoint families, provider breadth, MCP/A2A, deployment positioning.
- `ref/ARCHITECTURE.md` — gateway request flow, Redis/Postgres roles, cost tracking, hooks, background jobs, endpoint map.
- `ref/litellm/proxy/README.md` — proxy entry points, health routes, key/team management, and gateway layout.
- `ref/litellm/proxy/` — actual endpoint families including auth, routing, spend, guardrails, caching, modalities, MCP/A2A, management, and health.
- `ref/litellm/router.py` and `ref/litellm/proxy/router_strategy/` — routing and deployment-selection concepts.
- `ref/litellm/proxy/schema.prisma` and repositories — multi-tenant persistence model.

Representative 1Router sources reviewed:

- `apps/api/crates/core/` — provider transformations and OpenAI-compatible types.
- `apps/api/crates/gateway/` — Rust routing, auth, streaming, health, and gateway state.
- `apps/site/src/lib/auth.ts` and `request-auth.ts` — Better Auth and API-key identity.
- `apps/site/src/lib/usage.ts` — usage ledger and request quota reservations.
- `apps/site/src/app/api/chat/route.ts` — authenticated proxy, streaming usage capture, and current temporary rate limiter.
- `scripts/migrations/` and `scripts/migrate-app-db.sh` — versioned application schema.
- `README.md`, `apps/api/README.md`, and `apps/site/README.md` — current roadmap and deployment claims.
