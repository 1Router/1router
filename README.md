# 1Router — One Interface for All AI Models

1Router gives developers a single, OpenAI-compatible API for every AI model — with unified routing, pay-as-you-go pricing, and full data sovereignty.

This repository is a **monorepo** containing two deployed services and one shared catalog package.

## Monorepo layout

```
.
├── apps/
│   ├── site/          Next.js 15 frontend    → 1Router.com
│   └── api/           Axum/Rust backend      → api.1router.com  (scaffold)
├── packages/
│   └── models/        Shared catalog         → @1router/models
│                       (TS module for the site, JSON for the API)
├── turbo.json         Build orchestration
├── bun.lockb          Bun workspace lockfile (pnpm-lock kept under apps/site/ as fallback)
├── package.json       Root workspace manifest (bun workspaces)
└── LICENSE            FSL-1.1-Apache-2.0
```

## Apps

| Path        | URL               | Stack                            | Status   |
| ----------- | ----------------- | -------------------------------- | -------- |
| `apps/site` | 1router.com       | Next.js 15, React 19, Tailwind   | Active   |
| `apps/api`  | api.1router.com   | Rust, Axum, Tokio                | Scaffold |

## Packages

| Package          | Consumed by           | Purpose                                                              |
| ---------------- | --------------------- | -------------------------------------------------------------------- |
| `@1router/models`| `apps/site`, `apps/api` | Single source of truth for the supported model catalog. |

## Workspace tooling

- **Package manager** — [Bun](https://bun.sh) (workspaces). `pnpm-lock.yaml` is preserved under `apps/site/` as a fallback.
- **Build orchestration** — [Turborepo](https://turbo.build). The Rust crate is built directly with `cargo` (Turborepo's pipeline is configured in `turbo.json` for the JS side).

## Getting started

```bash
bun install                       # install workspace deps
bun run dev:site                  # → http://localhost:3000
bun run dev:api                   # → http://localhost:3000  (cargo run)
bun run build                     # builds site (turbo) + api (cargo --release)
bun run lint                      # lint everything
```

## How the apps stay in sync

The model catalog lives at **`packages/models/models.json`** (with a typed TS view at `packages/models/src/index.ts`). The site imports the TS module through the `@1router/models` workspace package; the Rust API embeds the JSON directly via `include_str!` at compile time. Both see the same catalog.

## License

Released under **FSL-1.1-Apache-2.0** — see [`LICENSE`](./LICENSE). Each release is irrevocably granted an additional Apache 2.0 license that becomes effective two years after release.
