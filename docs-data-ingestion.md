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

## OpenRouter comparison

OpenRouter's documented model endpoint is:

```text
GET https://openrouter.ai/api/v1/models
```

It provides live model metadata and pricing fields. It is a useful upstream for
refreshing a normalized catalog, but its schema must be mapped into the
1Router catalog and validated before publishing. Preserve source URLs,
retrieval time, and an explicit source/provider field rather than silently
replacing hand-curated metadata.

When 1Router routes a request through OpenRouter, optional app attribution
headers are supported by the gateway:

- `OPENROUTER_HTTP_REFERER` -> `HTTP-Referer`
- `OPENROUTER_TITLE` -> `X-OpenRouter-Title`
- `OPENROUTER_CATEGORIES` -> `X-OpenRouter-Categories`

These identify the 1Router application to OpenRouter. They do **not** provide
1Router with OpenRouter's private app leaderboard data.

OpenRouter documents model metadata and attribution. It may also expose
restricted or authenticated datasets/ranking surfaces, but those are not a
public general-purpose app-directory or app-traffic ingestion API for this
project. Do not scrape the OpenRouter website for rankings. If we want an
OpenRouter-derived model popularity view, keep it clearly labeled as external
data and use an officially supported dataset/API only after confirming its
access and redistribution terms.

## Recommended ingestion order

1. **Catalog refresh job**: fetch `/api/v1/models` daily, validate IDs/pricing,
   store a raw snapshot plus normalized records, and open a reviewable catalog
   update. Preserve source URL, retrieved-at timestamp, and field provenance;
   remove or quarantine stale usage metrics. Keep the checked-in JSON as the
   reproducible fallback for self-hosting.
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
5. **External sources**: add OpenRouter or other provider datasets as separate,
   attributed data sources rather than mixing them with first-party usage.

## Self-hosted behavior

A self-hosted deployment should work without external ingestion credentials. It
can use the checked-in model snapshot and show empty-state rankings/showcase
until local usage has been collected and an app is explicitly opted in. Managed
deployments can enable scheduled catalog refresh and aggregation workers with
operator-configured credentials.
