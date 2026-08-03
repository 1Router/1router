# Multi-stage build for the 1Router API (2-crate workspace: core + gateway).
#
# Build context should be the repo root so the core crate's build.rs can
# resolve `packages/models/models.json`.
#
# Usage:
#   docker build -f apps/api/Dockerfile -t 1router-api .
#   docker run --rm -p 3001:3001 -e RUST_LOG=info -e ROUTER_API_KEY=sk-... 1router-api

FROM rust:1.86-slim AS builder
RUN apt-get update \
 && apt-get install -y --no-install-recommends pkg-config libssl-dev ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# ── Cache-friendly dependency warm-up ────────────────────────────────────
# Copy just the workspace Cargo.toml + a stub for each crate so cargo can
# download + compile deps before the real source is copied in.
COPY apps/api/Cargo.toml /repo/apps/api/Cargo.toml

# Create stub crates so the workspace resolves
RUN mkdir -p /repo/apps/api/crates/core/src \
 && mkdir -p /repo/apps/api/crates/gateway/src \
 && echo "pub fn placeholder() {}" > /repo/apps/api/crates/core/src/lib.rs \
 && echo "fn main() {}" > /repo/apps/api/crates/gateway/src/main.rs

# Create stub Cargo.toml files for the crates
RUN printf '[package]\nname = "onerouter-core"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\n' > /repo/apps/api/crates/core/Cargo.toml \
 && printf '[package]\nname = "onerouter-gateway"\nversion = "0.1.0"\nedition = "2021"\n\n[[bin]]\nname = "api"\npath = "src/main.rs"\n\n[dependencies]\nonerouter-core = { path = "../core" }\n' > /repo/apps/api/crates/gateway/Cargo.toml

# Also need a stub models.json for the build script
RUN mkdir -p /repo/packages/models \
 && printf '{"models":[]}' > /repo/packages/models/models.json

RUN cd /repo/apps/api && cargo build --release 2>&1 || true

# ── Real build ───────────────────────────────────────────────────────────
# Copy the shared catalog
COPY packages/models/models.json /repo/packages/models/models.json

# Copy the real workspace manifests + all source
COPY apps/api/Cargo.toml /repo/apps/api/Cargo.toml
COPY apps/api/crates/core/Cargo.toml /repo/apps/api/crates/core/Cargo.toml
COPY apps/api/crates/core/build.rs /repo/apps/api/crates/core/build.rs
COPY apps/api/crates/core/src/ /repo/apps/api/crates/core/src/
COPY apps/api/crates/gateway/Cargo.toml /repo/apps/api/crates/gateway/Cargo.toml
COPY apps/api/crates/gateway/src/ /repo/apps/api/crates/gateway/src/

# Clean the stub artifacts and rebuild with real source
RUN touch /repo/apps/api/crates/core/src/lib.rs \
 && touch /repo/apps/api/crates/gateway/src/main.rs \
 && cd /repo/apps/api && cargo build --release

# ── Runtime image ────────────────────────────────────────────────────────
FROM debian:bookworm-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 1router \
 && useradd  --system --uid 1001 --gid 1router --create-home --shell /sbin/nologin 1router

COPY --from=builder /repo/apps/api/target/release/api /usr/local/bin/api

USER 1router
ENV BIND_ADDR=0.0.0.0:3001 \
    RUST_LOG=info
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/healthz >/dev/null || exit 1

CMD ["/usr/local/bin/api"]
