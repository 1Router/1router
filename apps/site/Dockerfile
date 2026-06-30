# Multi-stage build for the 1Router Next.js site.
#
# Uses bun to mirror the rest of the monorepo (workspace root + turbo.json +
# @1router/models + apps/api all use bun). The previous version hardcoded
# pnpm even though we deleted apps/site/pnpm-lock.yaml, so `docker build`
# would fail at `pnpm install`.
#
# Build context: repo root.
# Usage:
#   docker build -f apps/site/Dockerfile -t 1router-site .
#   docker run --rm -p 3000:3000 -e PORT=3000 1router-site

# ─── Stage 1: install + build ──────────────────────────────
FROM oven/bun:1.1 AS builder

WORKDIR /repo

# Copy root workspace manifests + the workspace package.jsons + the local
# tsconfig so bun can resolve `@1router/models` as a workspace package.
COPY package.json bun.lock turbo.json ./
COPY apps/site/package.json   ./apps/site/
COPY apps/site/next.config.ts ./apps/site/
COPY apps/site/tsconfig.json ./apps/site/
COPY apps/site/tailwind.config.ts ./apps/site/
COPY apps/site/postcss.config.mjs ./apps/site/
COPY apps/site/eslint.config.mjs ./apps/site/
COPY packages/models/package.json ./packages/models/

# Install (this hoists deps into /repo/node_modules just like a dev install).
RUN bun install --frozen-lockfile

# Now copy the rest of the source. Order matters: source goes in after the
# manifests to maximise Docker layer cache reuse when only source changes.
COPY apps/site    ./apps/site
COPY packages/models ./packages/models

# Build the Next.js site from apps/site.
WORKDIR /repo/apps/site
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ─── Stage 2: production runner ─────────────────────────────
FROM oven/bun:1.1-slim AS runner

WORKDIR /repo/apps/site
ENV NODE_ENV=production
ENV PORT=3000

# Runtime artifacts only.
COPY --from=builder /repo/apps/site/.next ./.next
COPY --from=builder /repo/apps/site/public ./public
COPY --from=builder /repo/apps/site/package.json ./

# Install only production deps so the runtime image stays slim.
COPY --from=builder /repo/bun.lock /repo/bun.lock
COPY --from=builder /repo/package.json /repo/package.json
COPY --from=builder /repo/apps/site/package.json /repo/apps/site/package.json
COPY --from=builder /repo/packages/models/package.json /repo/packages/models/package.json
WORKDIR /repo
RUN bun install --frozen-lockfile --production

USER bun
WORKDIR /repo/apps/site

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1

CMD ["bun", "run", "start"]
