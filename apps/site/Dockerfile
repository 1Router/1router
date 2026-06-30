# Multi-stage build for the 1Router Next.js site.
#
# Uses bun to mirror the rest of the monorepo. Single WORKDIR (/repo) for the
# whole file so the layer-cache story stays coherent.
#
# Build context: repo root.
# Usage:
#   docker build -f apps/site/Dockerfile -t 1router-site .
#   docker run --rm -p 3000:3000 1router-site

# ─── Stage 1: install + build ──────────────────────────────
FROM oven/bun:1.1 AS builder

WORKDIR /repo

# Copy only manifests and configs first so layer-cache stays warm when only
# source changes. Then the full source trees.
COPY package.json bun.lock turbo.json ./
COPY apps/site/package.json   ./apps/site/
COPY apps/site/next.config.ts ./apps/site/
COPY apps/site/tsconfig.json  ./apps/site/
COPY apps/site/tailwind.config.ts ./apps/site/
COPY apps/site/postcss.config.mjs ./apps/site/
COPY apps/site/eslint.config.mjs  ./apps/site/
COPY apps/site/components.json    ./apps/site/
COPY packages/models/package.json ./packages/models/

RUN bun install --frozen-lockfile

# Source tree.
COPY apps/site     ./apps/site
COPY packages/models ./packages/models

# Build the Next.js site.
WORKDIR /repo/apps/site
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ─── Stage 2: production runtime ────────────────────────────
FROM oven/bun:1.1-slim AS runner

# ca-certificates so HTTPS works for bun's registry pulls; skip wget because
# k8s httpGet probes already cover health.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

ENV NODE_ENV=production \
    PORT=3000

# Runtime artifacts.
# Use --chown=bun:bun on .next so the non-root `bun` user can write to
# .next/cache without a startup permission error.
COPY --from=builder --chown=bun:bun /repo/apps/site/.next ./apps/site/.next
COPY --from=builder /repo/apps/site/public ./apps/site/public

# Install only production deps from the hoisted root lockfile.
COPY --from=builder /repo/package.json        ./package.json
COPY --from=builder /repo/bun.lock            ./bun.lock
COPY --from=builder /repo/apps/site/package.json     ./apps/site/package.json
COPY --from=builder /repo/packages/models/package.json ./packages/models/package.json
RUN bun install --frozen-lockfile --production

USER bun
WORKDIR /repo/apps/site

EXPOSE 3000

CMD ["bun", "run", "start"]
