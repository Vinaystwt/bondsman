# Bondsman Backend Design

## Scope

Bondsman is a Casper testnet backend for bonded autonomous invoice approvals. The deliverable contains four Odra contracts, testnet deployment and deterministic seed tooling, an Anthropic-backed agent, a Casper event listener, a SQLite-backed REST API, and an end-to-end demo. It contains no frontend.

## Architecture

The repository is a monorepo with two build domains:

- `contracts/` is a pinned Odra Rust workspace containing `MockCsprUSD`, `BondVault`, `BondsmanController`, and `InvoicePool`.
- `backend/` and `scripts/` are TypeScript packages using the Casper SDK for signing and RPC access, the Anthropic SDK for inference, Fastify for HTTP, and SQLite for the read model.

Odra is pinned to `2.8.2`, matching its exact `casper-client` pin of `5.0.0`. The first successful dependency resolution is retained and dependency updates are prohibited during the build.

`deployments/testnet.json` is the stable contract-address boundary. The documented REST API is the stable frontend boundary.

## Contract Responsibilities

`MockCsprUSD` wraps the `odra-modules` CEP-18 implementation and adds owner-gated minting.

`BondVault` exclusively holds bonds. The controller may lock approved CEP-18 funds, refund a clean bond, or split a slashed bond between the challenger and the invoice pool. It performs both transfers during a slash.

`InvoicePool` owns invoice state, pays vendors, records the first paid action for each claim hash, and marks later actions for the same claim as duplicates. It also tracks the accounting reserve after tokens have already arrived from the vault.

`BondsmanController` owns the action lifecycle, deterministic bond calculation, challenge window, and reputation. Casper block time is treated as milliseconds. The configured window is converted with `window_secs * 1000`.

Cross-contract authorization is narrow: only the controller can mutate the vault or execute pool payouts and reserve accounting. A challenge succeeds only when `InvoicePool` proves the action is a duplicate.

## Action Data Flow

The agent receives one invoice without cross-invoice memory and makes one temperature-zero Anthropic call. A strict JSON parser extracts the decision, reasoning, and confidence. Rejections are persisted off-chain without a contract action.

For an approval, the runner hashes the reasoning and claim fields, initiates the action, reads the required bond, approves the vault, posts the bond, and executes the payout. Each deploy hash and the plaintext reasoning are persisted in SQLite.

The listener consumes contract events when streaming is available and reconciles state from RPC reads. This makes reconnects and degraded public-RPC operation recoverable. Event identity is unique by deploy hash and event index, making ingestion idempotent.

The challenge endpoint signs with the challenger account, submits the challenge, waits for execution, then resolves the slash. A clean-resolution poller finds executed actions past their deadline and submits refunds. A manual resolution endpoint uses the same service.

## Deployment and Seed Flow

Deployment reads the ignored deployer PEM from local configuration, generates ignored agent and challenger keypairs, funds both with CSPR, builds and installs the contracts, wires their addresses, mints bond and payout liquidity, and writes the stable deployment file.

Seeding creates one clean invoice and a duplicate pair whose claim hashes match. It executes enough deterministic actions to leave a challenged fallback action available. The demo resolves that slash and runs a clean action through refund, printing all deploy hashes.

The deployer retains a conservative reserve for four contract installs and initialization calls. Funding and mint amounts are constants documented in the README.

## API and Persistence

SQLite is the canonical off-chain read model, never the authority for slashing. Tables cover invoices, decisions, actions, deploys, events, bonds, reputation snapshots, and reserve entries.

The API exposes invoices, action lists and details, agent history, reserve state, challenge, manual resolution, and deployment metadata. Explorer links are derived from testnet deploy and contract hashes.

Errors use stable JSON with an error code, message, and optional details. Submission endpoints distinguish validation failures, on-chain reverts, RPC failures, and pending deploys.

## Security and Reliability

PEM files, generated keys, environment files, and databases are ignored. Secrets are never logged or included in command output. Startup validates chain name as `casper-test`.

All token arithmetic uses `U256` with nine decimal places. Basis-point multiplication checks bounds before division. Mutating HTTP operations serialize per action to prevent duplicate submissions.

RPC operations use bounded retries and deploy-status polling. Missing CSPR.cloud credentials select the public testnet RPC and produce a warning without blocking startup.

## Testing and Verification

Contract tests cover minting, transfers, allowances, lock, release, slash allocation, controller authorization, insufficient bond rejection, duplicate detection, frivolous challenge rejection, slash resolution, refund resolution, reputation changes, reserve accounting, and millisecond deadlines.

TypeScript tests cover strict LLM parsing, hashing, amount conversion, event idempotency, API schemas, resolution selection, deployment-file validation, and mocked Casper client error handling.

Each checkpoint requires its focused tests plus the accumulated suite. Before completion, the full Rust and TypeScript suites, secret scans, clean Git checks, live contract reads, live API checks, and both testnet demo paths must pass.

## Engineering Decisions

The package manager is npm and the supported runtime is Node 24, which is installed locally and is an active LTS line. Fastify provides schema-driven REST handling. SQLite uses a synchronous embedded driver behind repository interfaces to keep action updates transactional and simple.

The public RPC is sufficient for deployment, reads, and polling. Event streaming is opportunistic without a CSPR.cloud key; periodic RPC reconciliation preserves correctness.
