# Multi-stage build for the 1Router API.
#
# Preserves the monorepo layout inside the builder image so that
#   - apps/api/build.rs can resolve `../../packages/models/models.json`
#   - apps/api/src/main.rs can `include_str!("../catalog/models.json")`
#
# Build context should be the repo root.
#
# Usage:
#   docker build -f apps/api/Dockerfile -t 1router-api .
#   docker run --rm -p 3000:3000 -e RUST_LOG=info 1router-api

FROM rust:1.81-slim AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# Cache-friendly: just copy the manifest and a stub source so cargo can warm
# the deps cache before doing the real build.
COPY apps/api/Cargo.toml apps/api/Cargo.lock* /repo/apps/api/
RUN mkdir -p /repo/apps/api/src \
 && echo "fn main(){}" > /repo/apps/api/src/main.rs \
 && cd /repo/apps/api \
 && cargo build --release \
 && rm -rf /repo/apps/api/src /repo/apps/api/target/release/api

# Make the shared catalog available at the path build.rs + main.rs expect.
COPY packages/models/models.json /repo/packages/models/models.json

# Real build: copy the live source and build script in.
COPY apps/api/src  /repo/apps/api/src/
COPY apps/api/build.rs /repo/apps/api/build.rs

# Touch a sentinel so the warm-cache build of the dummy crate is invalidated now
# that the real source + build.rs are present. Cargo uses mtimes, so re-touching
# src/main.rs forces a rebuild from scratch.
RUN touch /repo/apps/api/src/main.rs \
 && cd /repo/apps/api \
 && cargo build --release \
 && echo "expected binary: /repo/apps/api/target/release/api"

FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 1router \
 && useradd  --system --uid 1001 --gid 1router --create-home --shell /sbin/nologin 1router

COPY --from=builder /repo/apps/api/target/release/api /usr/local/bin/api

USER 1router
ENV BIND_ADDR=0.0.0.0:3000 \
    RUST_LOG=info
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1

CMD ["/usr/local/bin/api"]
