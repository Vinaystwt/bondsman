# Bondsman Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, deploy, seed, and verify the complete Bondsman backend on Casper testnet.

**Architecture:** Four pinned Odra contracts enforce the bonded action lifecycle. TypeScript services sign deploys, call Anthropic, ingest Casper events into SQLite, expose the REST boundary, and drive a deterministic two-path demo.

**Tech Stack:** Rust nightly `2026-01-01`, Odra `2.8.2`, casper-client `5.0.0`, Node 24, TypeScript, npm, Casper JavaScript SDK, Anthropic SDK, Fastify, SQLite, Vitest.

---

## File Map

`contracts/src/` contains one focused module per contract plus shared action types. `contracts/tests/` contains cross-contract lifecycle tests. Odra build and CLI entrypoints live under `contracts/bin/`.

`backend/src/config`, `casper`, `db`, `agent`, `listener`, and `api` contain configuration, chain access, persistence, inference, ingestion, and HTTP concerns respectively. `backend/src/demo.ts` orchestrates the live proof.

`scripts/deploy.ts` owns key generation, funding, contract installation, wiring, minting, and deployment metadata. `scripts/seed.ts` owns deterministic invoices and fallback action state.

### Task 1: Toolchain and Workspace

**Files:**
- Create: `rust-toolchain`
- Create: `contracts/Cargo.toml`
- Create: `contracts/Odra.toml`
- Create: `contracts/build.rs`
- Create: `contracts/bin/build_contract.rs`
- Create: `contracts/bin/build_schema.rs`
- Create: `contracts/bin/cli.rs`
- Create: `contracts/src/lib.rs`
- Create: `package.json`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `.env.example`

- [ ] Install `odra-cli` `2.8.2`, install the pinned Rust toolchain and WASM target, then record exact dependency pins.
- [ ] Write a smoke test module whose test deploys it in `odra_test::env()` and asserts a stored value.
- [ ] Run `cargo test --manifest-path contracts/Cargo.toml`; expect the smoke test to pass.
- [ ] Run the Odra build command; expect a WASM artifact and schema.
- [ ] Remove the smoke module only after the real contract module files exist.
- [ ] Commit as `chore/toolchain: scaffold pinned Odra workspace`.

### Task 2: Mock csprUSD

**Files:**
- Create: `contracts/src/mock_cspr_usd.rs`
- Create: `contracts/tests/mock_cspr_usd.rs`
- Modify: `contracts/src/lib.rs`

- [ ] Write tests that deploy with zero supply, assert metadata, reject a non-owner mint, mint to an account, transfer, approve, and transfer through an allowance.
- [ ] Run the focused tests and confirm owner minting and allowance transfer are missing.
- [ ] Implement `MockCsprUSD` with `SubModule<Cep18>`, an owner `Var<Address>`, fixed metadata, delegated CEP-18 entrypoints, and owner-gated `mint`.
- [ ] Run the focused tests and full contract suite; expect all assertions to pass.
- [ ] Commit as `feat/token: add mock csprUSD`.

### Task 3: Bond Vault

**Files:**
- Create: `contracts/src/bond_vault.rs`
- Create: `contracts/src/types.rs`
- Create: `contracts/tests/bond_vault.rs`
- Modify: `contracts/src/lib.rs`

- [ ] Write tests for controller gating, allowance failure, successful lock, exact `total_locked`, full release, and a 50/50 slash where both recipient balances and terminal status are asserted.
- [ ] Run the focused tests and confirm the vault symbols are absent.
- [ ] Implement `Bond`, `BondStatus`, vault storage, CEP-18 cross-contract calls, checked status transitions, events, and typed errors.
- [ ] Run focused and accumulated tests; expect all vault paths to pass.
- [ ] Commit as `feat/bond-vault: add bond custody lifecycle`.

### Task 4: Controller Core Lifecycle

**Files:**
- Create: `contracts/src/bondsman_controller.rs`
- Create: `contracts/tests/controller.rs`
- Modify: `contracts/src/types.rs`
- Modify: `contracts/src/lib.rs`

- [ ] Write tests for the three bond tiers, negative-reputation penalty cap, unique action identifiers, caller ownership, post-bond transition, and execution rejection when `bond_posted < bond_required`.
- [ ] Run the focused tests and confirm the controller is missing.
- [ ] Implement action and reputation state, deterministic basis-point math, initiation, vault deposit, and executed-state preconditions.
- [ ] Run focused and accumulated tests; expect lifecycle and rejection assertions to pass.
- [ ] Commit as `feat/controller: add bonded action lifecycle`.

### Task 5: Invoice Pool and Fraud Proof

**Files:**
- Create: `contracts/src/invoice_pool.rs`
- Create: `contracts/tests/invoice_pool.rs`
- Modify: `contracts/src/bondsman_controller.rs`
- Modify: `contracts/src/lib.rs`

- [ ] Write tests that seed two invoices with one claim hash, pay both, assert vendor balances, assert only the second action is duplicate, and reject a non-controller payout.
- [ ] Run the focused tests and confirm the pool symbols are missing.
- [ ] Implement invoice storage, controller-gated payouts, first-claim recording, duplicate flags, events, and reserve accounting.
- [ ] Connect controller execution to pool payout and set `window_end = block_time_ms + window_secs * 1000`.
- [ ] Run focused and accumulated tests; expect duplicate proof and payout assertions to pass.
- [ ] Commit as `feat/invoice-pool: add payout fraud proof`.

### Task 6: Slash and Refund Resolution

**Files:**
- Create: `contracts/tests/resolution.rs`
- Modify: `contracts/src/bondsman_controller.rs`
- Modify: `contracts/src/bond_vault.rs`
- Modify: `contracts/src/invoice_pool.rs`

- [ ] Write tests that reject a non-duplicate challenge, reject a late challenge, slash a challenged duplicate, assert challenger and pool token balances, assert reserve accounting without a second transfer, and refund an expired clean action.
- [ ] Assert reputation deltas of `-50` and `+10`, and assert terminal action and bond states.
- [ ] Run the focused tests and confirm challenge and resolution entrypoints are absent.
- [ ] Implement challenge proof calls, challenger persistence, vault split transfer, reserve counter update, refund, reputation mutation, and resolution events.
- [ ] Run the complete contract suite and Odra build; expect all paths and WASM builds to pass.
- [ ] Commit as `feat/slash-refund: complete resolution paths`.

### Task 7: Testnet Deployment

**Files:**
- Create: `backend/src/config/env.ts`
- Create: `backend/src/casper/keys.ts`
- Create: `backend/src/casper/rpc.ts`
- Create: `backend/src/casper/contracts.ts`
- Create: `backend/src/casper/deploys.ts`
- Create: `backend/src/shared/deployment.ts`
- Create: `scripts/deploy.ts`
- Create: `deployments/.gitkeep`
- Modify: `backend/package.json`
- Modify: `package.json`

- [ ] Write Vitest tests for strict `casper-test` validation, public RPC fallback, deployment-file schema, key path loading, and deploy-status polling.
- [ ] Run the focused tests and confirm configuration and clients are absent.
- [ ] Implement configuration and Casper wrappers using pinned SDK APIs, never logging secret material.
- [ ] Implement deployment: generate ignored keys, transfer conservative CSPR funding, install four WASM contracts through the Odra livenet client, wire addresses, mint liquidity, and atomically write `deployments/testnet.json`.
- [ ] Run TypeScript checks and tests, then run deployment with the ignored local environment.
- [ ] Query each installed contract through RPC and record explorer links in deployment metadata.
- [ ] Commit as `feat/deploy: deploy and wire testnet contracts`.

### Task 8: Autonomous Agent

**Files:**
- Create: `backend/src/agent/prompt.ts`
- Create: `backend/src/agent/decision.ts`
- Create: `backend/src/agent/hashing.ts`
- Create: `backend/src/agent/runner.ts`
- Create: `backend/src/agent/main.ts`
- Create: `backend/test/agent/decision.test.ts`
- Create: `backend/test/agent/hashing.test.ts`

- [ ] Write tests for JSON extraction from fenced or surrounded prose, schema rejection, confidence bounds, exact Blake2b-256 output, and deterministic claim input.
- [ ] Run focused tests and confirm agent modules are missing.
- [ ] Implement one-call Anthropic decisions at temperature zero with no paid-claim context.
- [ ] Implement approve flow: initiate, read required bond, token approve, post bond, execute, and persist reasoning plus deploy hashes.
- [ ] Run all TypeScript tests, then execute one real decision against testnet and verify the resulting action by RPC.
- [ ] Commit as `feat/agent: add autonomous bonded runner`.

### Task 9: Listener and REST API

**Files:**
- Create: `backend/src/db/schema.ts`
- Create: `backend/src/db/database.ts`
- Create: `backend/src/db/repositories.ts`
- Create: `backend/src/listener/events.ts`
- Create: `backend/src/listener/reconcile.ts`
- Create: `backend/src/listener/main.ts`
- Create: `backend/src/api/schemas.ts`
- Create: `backend/src/api/resolution.ts`
- Create: `backend/src/api/routes.ts`
- Create: `backend/src/api/server.ts`
- Create: `backend/src/api/main.ts`
- Create: `backend/test/listener/events.test.ts`
- Create: `backend/test/api/routes.test.ts`

- [ ] Write tests for database migrations, idempotent event upserts, action state projection, expired clean-action selection, every response schema, challenge sequencing, manual resolution, and deployment serving.
- [ ] Run focused tests and confirm persistence and HTTP modules are missing.
- [ ] Implement transactional repositories, stream ingestion with reconnect, RPC reconciliation, clean-resolution polling, and Fastify routes.
- [ ] Run all TypeScript tests and type checks.
- [ ] Start listener and API against testnet; verify invoices, actions, action detail, agent, reserve, resolution, and deployment endpoints.
- [ ] Commit as `feat/api-listener: add indexed REST backend`.

### Task 10: Deterministic Seed and Demo

**Files:**
- Create: `backend/src/shared/invoices.ts`
- Create: `scripts/seed.ts`
- Create: `backend/src/demo.ts`
- Create: `backend/test/demo.test.ts`
- Create: `README.md`
- Modify: `package.json`
- Modify: `.env.example`

- [ ] Write tests asserting invoices `1045` and `1046` share a claim hash, the clean invoice differs, demo steps wait for confirmed deploys, and output includes deploy hashes for both terminal paths.
- [ ] Run focused tests and confirm seed and demo modules are missing.
- [ ] Implement invoice submission and a prebuilt challenged fallback action.
- [ ] Implement `npm run demo` to resolve the challenged duplicate and execute then refund the clean path after its testnet deadline.
- [ ] Document architecture, security, pins, funding, amounts, deployment addresses, every endpoint with response examples, all run commands, and wallet/faucet prerequisites.
- [ ] Run Rust tests, TypeScript tests, type checks, secret scans, prohibited-name scans, and Git staged-file checks.
- [ ] Run the live demo and verify terminal contract state, balances, reputation, reserve, listener projection, and API responses.
- [ ] Commit as `feat/seed: add deterministic testnet demo`.

### Task 11: Completion Audit

**Files:**
- Modify only files required by audit findings.

- [ ] Run `cargo test --manifest-path contracts/Cargo.toml` and the Odra WASM build; expect success.
- [ ] Run `npm test`, `npm run typecheck`, and `npm run demo`; expect success and confirmed deploy hashes.
- [ ] Scan tracked files for PEM blocks, API key prefixes, environment secrets, prohibited names, mainnet identifiers, and native-payable bond code; expect no matches.
- [ ] Query all contract hashes from `deployments/testnet.json` and every REST route; expect live testnet data.
- [ ] Confirm no PEM, environment, or `.keys/` file is tracked or staged.
- [ ] Commit only if the audit required corrections, using a narrowly scoped message.
