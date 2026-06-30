# Multi-stage build for the 1Router Next.js site.
#
# Uses bun to mirror the rest of the monorepo. Single WORKDIR (/repo) for the
# whole file so the layer-cache story stays coherent; install wget in the
# runner so HEALTHCHECK actually has a probe binary.
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

# Install wget so the HEALTHCHECK probe actually exists in the slim image.
# oven/bun:1.1-slim is Debian-slim based and does not ship wget by default.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

ENV NODE_ENV=production \
    PORT=3000

# Runtime artifacts.
COPY --from=builder /repo/apps/site/.next ./apps/site/.next
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

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["bun", "run", "start"]
