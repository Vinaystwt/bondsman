# Bondsman backend, hosted. Builds the Odra contract CLI (used only to call
# already-deployed entry points; contracts/resources/casper-test-contracts.toml
# already records the live addresses, so this build never redeploys anything)
# and runs one of api / listener / watchdog depending on the START_SCRIPT env
# var, set per Railway service.

FROM rust:1-bookworm AS rust-base

# Debian bookworm's apt binaryen package is too old for the wasm-opt flags
# cargo-odra passes (missing --signext-lowering). Install a recent release
# directly, matching the version used locally.
RUN apt-get update && apt-get install -y --no-install-recommends curl xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL -o /tmp/binaryen.tar.gz \
    https://github.com/WebAssembly/binaryen/releases/download/version_130/binaryen-version_130-x86_64-linux.tar.gz \
  && tar -xzf /tmp/binaryen.tar.gz -C /tmp \
  && cp /tmp/binaryen-version_130/bin/wasm-opt /usr/local/bin/wasm-opt \
  && rm -rf /tmp/binaryen.tar.gz /tmp/binaryen-version_130

RUN rustup toolchain install nightly-2026-01-01 \
  && rustup target add wasm32-unknown-unknown --toolchain nightly-2026-01-01 \
  && rustup default nightly-2026-01-01

RUN cargo install cargo-odra --version 0.1.7 --locked

WORKDIR /app
COPY contracts/ ./contracts/
COPY rust-toolchain.toml ./rust-toolchain.toml

RUN cd contracts && cargo odra build

# ---

FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates openssl python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm install --workspaces --include-workspace-root

COPY backend/ ./backend/
COPY deployments/ ./deployments/
COPY contracts/resources/ ./contracts/resources/
COPY contracts/Odra.toml ./contracts/Odra.toml
COPY scripts/railway-boot.mjs ./scripts/railway-boot.mjs

# The compiled CLI binary the backend spawns at runtime, not part of git.
COPY --from=rust-base /app/contracts/target ./contracts/target

ENV NODE_ENV=production

ENTRYPOINT ["node", "scripts/railway-boot.mjs"]
