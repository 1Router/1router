# Model, ranking, and app data

## Current sources

### Model cards

The model catalog is currently a checked-in snapshot:

- Source: `packages/models/models.json`
- Site consumer: `packages/models/src/index.ts`
- Rust consumer: `apps/api/crates/core/src/catalog.rs` (embedded at build time)
- UI consumers: `/models`, model detail pages, homepage trending cards, and
  provider pages

This means the site and gateway use the same model IDs, names, providers,
context lengths, pricing, capabilities, and modality metadata. It is not yet a
live provider catalog. The `lastGenerated` field in `models.json` should be
updated when a refresh job replaces the snapshot. The older `apiCalls30d` and
`trending` fields are not used as public usage claims; featured homepage cards
are currently selected by release date until sourced popularity data is wired.

### Rankings

`/rankings` now reads the public `/api/rankings` route, which aggregates
successful authenticated proxy requests from `router_usage` by model. It
returns empty state rather than synthetic values when a deployment has no
recorded traffic. The route includes a source note and reporting timestamp.

The first-party source is the authenticated 1Router usage ledger:
`scripts/migrations/001_usage_ledger.sql` creates `router_usage`, and the
Next.js proxy records authenticated browser/API-proxy requests in
`apps/site/src/lib/usage.ts`. Direct gateway clients and anonymous demo traffic
remain outside this first-party public aggregation until a durable gateway
event pipeline is added.

Direct Rust gateway clients and anonymous demo traffic are not currently in
that ledger, so they must be added to a durable gateway event pipeline before
rankings can be marketed as platform-wide usage.

### App showcase

The homepage app showcase now reads `/api/applications/public`, backed by
explicitly registered records in `router_applications` and usage rows linked by
`application_id`. Owners register an app from `/account`, then send its slug in
the `X-1Router-Application` header. Public display requires an explicit opt-in;
otherwise the app remains private. Empty deployments show no synthetic rows.

The attribution header is accepted only for an authenticated owner and must
resolve to an app owned by that identity. Do not infer app names from
`User-Agent`, `Referer`, or arbitrary client headers. The same explicit
attribution pattern can later be extended to organization-owned projects.

## Independent catalog policy

1Router is the catalog and routing layer, not a downstream of another
aggregator. The refresh pipeline must use direct provider APIs and official
provider documentation, then normalize and validate the result before updating
`packages/models/models.json`.

Do not use another gateway as a catalog source, pricing source, ranking source,
or hidden fallback. Provider metadata must identify the direct provider and its
canonical model page. 1Router's own rankings come from the authenticated
`router_usage` ledger, not from an external leaderboard.

The catalog remains a checked-in, reproducible snapshot for self-hosted
installations. A future refresh job may collect direct sources such as provider
model-list endpoints, official pricing pages, and community-submitted provider
manifests, but every imported field must retain its source URL and retrieval
time for review.

## Recommended ingestion order

1. **Catalog refresh job**: fetch approved direct provider model-list endpoints
   and official pricing metadata daily, validate IDs/pricing, store raw snapshots
   plus normalized records, and open a reviewable catalog update. Preserve
   source URL, retrieved-at timestamp, and field provenance; remove or quarantine
   stale usage metrics. Keep the checked-in JSON as the reproducible fallback
   for self-hosting.
2. **First-party usage aggregation**: the initial public model aggregation is
   now served from indexed `router_usage` queries at `/api/rankings`, with a
   clear `dataSource`, reporting note, and empty state. Add materialized hourly/
   daily aggregates as traffic grows.
3. **Project/app identity**: explicit Better Auth-owned application records,
   `application_id` attribution, and public opt-in are now implemented. Extend
   ownership to organizations and key-level defaults before managed launch.
4. **Public analytics API**: rankings and opted-in showcase records are now
   served as cached control-plane APIs with no raw prompt/content data. Add
   rate limiting, abuse protection, and an admin moderation workflow next.
5. **Community providers**: accept signed or manually reviewed provider
   manifests as separate catalog inputs. Keep provider submissions distinct from
   first-party usage until the deployment has passed health, security, and policy
   checks.

## Self-hosted behavior

A self-hosted deployment should work without external ingestion credentials. It
can use the checked-in model snapshot and show empty-state rankings/showcase
until local usage has been collected and an app is explicitly opted in. Managed
deployments can enable scheduled catalog refresh and aggregation workers with
operator-configured credentials.
