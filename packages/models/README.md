# `@1router/models`

Canonical, shared definition of AI model metadata used by **both `apps/site`** (1Router.com — Next.js) and **`apps/api`** (api.1router.com — Rust/Axum).

## Layout

```
packages/models/
├── src/
│   ├── index.ts           # Typed catalog consumed by the site
│   └── provider-colors.ts # Per-provider brand badge styling
└── models.json            # Catalog snapshot — read by the API at startup
```

The site imports the TS module via `@1router/models`. The API loads the JSON file directly at startup (Rust reads it once and serves it from `/v1/models`).

## Schema — catalog entry (`models.json`)

The framework-agnostic fields the catalog uses today:

| field              | type                                                             | used for                              |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------- |
| `id`               | `"provider/model"` slug                                          | routing key (e.g. `openai/gpt-4o`)    |
| `name`             | string                                                           | UI                                    |
| `provider`         | string (display name)                                            | UI badge                              |
| `providerSlug`     | string (URL-safe)                                                | UI routing + API                      |
| `description`      | string                                                           | UI                                    |
| `series`           | string                                                           | UI filter                             |
| `contextLength`    | number (tokens)                                                  | UI + future request validation        |
| `pricing.input`    | number (USD / 1M tokens; 0 = free)                                | UI + future billing                   |
| `pricing.output`   | number (USD / 1M tokens; 0 = free)                                | UI + future billing                   |
| `capabilities`     | string[]                                                         | UI filter + future request validation |
| `modality`         | string[] (`"text" \| "vision" \| "audio" \| "embedding" \| ...`) | UI filter + future request validation |
| `releaseDate`      | ISO date string                                                   | UI recency                            |
| `license`          | per-model license string (e.g. `"mit" \| "open" \| "gemma" \| "non-commercial"`) — describes the **upstream model**, not the project | UI |
| `freeEndpoint`     | boolean                                                          | UI                                    |
| `downloadable`     | boolean                                                          | UI                                    |
| `trending`         | boolean                                                          | UI homepage                           |

## Future: provider pool & per-provider data-handling attestations

When the Rust API actually proxies requests (TBD), it will not hard-code a single credential per provider. Instead it will pick from a **provider pool** with failover, weighted routing, and credential rotation. To support that — and the user's stated requirement that every upstream confirm **it does not log, retain, or train on our prompts** — this package will grow a sibling file:

```
packages/models/
└── providers.json
```

with one entry per provider describing:

| field                   | type                                                              | meaning                                                                                                  |
| ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `slug`                  | string                                                            | matches `model.providerSlug`                                                                            |
| `name`                  | string                                                            | display name                                                                                             |
| `apiBase`               | URL                                                               | upstream OpenAI-compatible base URL                                                                      |
| `credentialEnvVars`    | string[]                                                          | which env vars the API should consult for credentials                                                    |
| `rotationHint`          | `"manual" \| "auto"`                                              | how the upstream supports credential rotation                                                            |
| `dataPolicy`            | object                                                            | upstream attestation                                                                                     |
| `dataPolicy.noLog`            | `"yes" \| "no" \| "unknown"`                                | whether the upstream confirms it does not log requests                                                  |
| `dataPolicy.retainPrompts`   | `"yes" \| "no" \| "unknown"`                                | whether prompts are retained beyond the request lifecycle                                                |
| `dataPolicy.trainOnInputs`   | `"yes" \| "no" \| "unknown"`                                | whether prompts are used for training                                                                    |
| `dataPolicy.evalShareOptOut` | `"yes" \| "no" \| "unknown"`                                | whether the upstream is opted out of evaluation/feedback sharing                                         |
| `dataPolicy.documentedAt`    | URL                                                          | link to the provider's official policy page for verification                                            |

The site's per-model detail page will surface `dataPolicy` per provider so users can see — at a glance — whether the upstream they are about to send their prompt to has promised to leave it alone.

## License

Released under FSL-1.1-Apache-2.0 — see `/LICENSE` at the repo root.
