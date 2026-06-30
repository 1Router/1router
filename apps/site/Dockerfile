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
# Pin to oven/bun:1.3 (matches the bun that generated bun.lock on the host).
# Bun 1.1 cannot parse 1.2+/1.3 lockfile formats, so without this pin
# `bun install --frozen-lockfile` fails with InvalidLockfileVersion.
# 1.3 (explicit) is preferable to 1 (mutable / latest 1.x) so future bun
# minor releases don't silently drift away from the frozen lockfile schema.
FROM oven/bun:1.3 AS builder

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

# The site’s static assets live at /public (repo root) so they survive the
# monorepo flatten — they need to end up at apps/site/public in the image
# because that’s what Next.js serves from. Placed AFTER bun install so changes
# to public/ only invalidate this single layer, not the install layer.
COPY public ./apps/site/public

# Source tree.
COPY apps/site     ./apps/site
COPY packages/models ./packages/models

# Build the Next.js site.
WORKDIR /repo/apps/site
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ─── Stage 2: production runtime ────────────────────────────
# Same pin as the builder — keeps the runtime on the same bun minor as the
# lockfile was generated against. Slim variant; trimming curl'd layers.
FROM oven/bun:1.3-slim AS runner

# ca-certificates so HTTPS works for bun's registry pulls; skip wget because
# k8s httpGet probes cover health.
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
