# Multi-stage build for the 1Router API (2-crate workspace: core + gateway).
#
# Build context should be the repo root so the core crate's build.rs can
# resolve `packages/models/models.json`.
#
# Usage:
#   docker build -f apps/api/Dockerfile -t 1router-api .
#   docker run --rm -p 3001:3001 -e RUST_LOG=info -e ROUTER_API_KEY=sk-... 1router-api

FROM rust:1.99.1-slim-bookworm AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# Keep the checked-in dependency versions and cache real compilation work.
# Limit parallel compilation on the shared deployment server.
COPY apps/api/Cargo.toml apps/api/Cargo.lock /repo/apps/api/
COPY packages/models/models.json /repo/packages/models/models.json
COPY apps/api/crates /repo/apps/api/crates
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/repo/apps/api/target \
    cd /repo/apps/api \
 && cargo build --release --locked --jobs 2 \
 && cp target/release/api /usr/local/bin/api

# ── Runtime image ────────────────────────────────────────────────────────
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 1router \
 && useradd  --system --uid 1001 --gid 1router --create-home --shell /sbin/nologin 1router

COPY --from=builder /usr/local/bin/api /usr/local/bin/api

USER 1router
ENV BIND_ADDR=0.0.0.0:3001 \
    RUST_LOG=info
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz >/dev/null || exit 1

CMD ["/usr/local/bin/api"]
