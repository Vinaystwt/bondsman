# Demo Arm Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve MockCsprUSD, redeploy the three stateful contracts with a 1,800-second challenge window, reseed them, and expose an idempotent endpoint that creates one fresh duplicate action per call.

**Architecture:** Odra’s contract registry will retain only the existing token entry before a default-mode deployment, causing Vault, Controller, and Pool to install fresh while MockCsprUSD loads by its existing package hash. The endpoint serializes arm requests, creates a unique invoice with the seeded duplicate claim digest, funds balances as needed, executes the existing agent’s allowance/bond/payout sequence, projects the result into SQLite, and returns the shared action-detail representation.

**Tech Stack:** Odra 2.8.2, Casper testnet, TypeScript, Fastify, SQLite, Vitest.

---

### Task 1: Partial Odra Redeployment

**Files:**
- Modify: `contracts/cli/src/main.rs`
- Create: `scripts/redeploy.ts`
- Modify: `backend/package.json`
- Modify: `package.json`
- Test: `backend/test/casper/redeploy.test.ts`

- [ ] Write a failing test that reduces an Odra registry containing four contracts to the MockCsprUSD block and preserves its package hash.
- [ ] Run `npm --workspace backend test -- test/casper/redeploy.test.ts`; expect failure because the registry reducer is absent.
- [ ] Implement the registry reducer and a redeploy script that verifies the preserved token hash, invokes Odra in default mode, resolves all current contract hashes, and atomically updates `deployments/testnet.json`.
- [ ] Change only the deploy constructor argument from `window_secs: 300` to `window_secs: 1_800`.
- [ ] Run the focused test, TypeScript checking, and Rust contract tests.
- [ ] Execute `npm run redeploy`; confirm the token package and contract hashes are unchanged while Vault, Controller, and Pool hashes change.

### Task 2: Reseed Fresh State

**Files:**
- Reuse: `scripts/seed.ts`
- Reuse: `backend/src/shared/invoices.ts`

- [ ] Run `npm run seed` against the new Pool and Controller.
- [ ] Query the baseline and duplicate actions; assert 50,000 csprUSD amounts, real reasoning digests, duplicate proof, and 1,800,000 millisecond execution windows.
- [ ] Record confirmed seed transaction hashes in ignored operational state.

### Task 3: Shared Action Detail

**Files:**
- Modify: `backend/src/api/routes.ts`
- Test: `backend/test/api/routes.test.ts`

- [ ] Add a failing route test asserting `POST /api/demo/arm` calls the arm service and returns the same fields as `GET /api/actions/:id`.
- [ ] Extract one action-detail serializer used by both routes, including events and explorer links.
- [ ] Run `npm --workspace backend test -- test/api/routes.test.ts`; expect all route tests to pass.

### Task 4: Arm Service

**Files:**
- Create: `backend/src/api/arm.ts`
- Modify: `backend/src/agent/runner.ts`
- Modify: `scripts/seed.ts`
- Modify: `backend/src/demo.ts`
- Modify: `backend/src/api/main.ts`
- Modify: `backend/src/api/server.ts`
- Test: `backend/test/api/arm.test.ts`

- [ ] Write failing tests for monotonic invoice identifiers, serialized concurrent calls, duplicate-proof rejection, and the 1,800-second window invariant.
- [ ] Export idempotent agent-run persistence from the agent module and update seed/demo imports.
- [ ] Implement the service using the existing deployer, agent, and challenger keys. Before each arm, top up native agent/challenger balances and token balances for the agent and Pool when below their operating targets.
- [ ] Submit a unique invoice with the seeded collision digest, call initiate, approve, post bond, and execute, verify `is_action_duplicate`, verify the window, persist reasoning, project the action, and return shared action detail.
- [ ] Run the focused tests, full TypeScript suite, and type checking.

### Task 5: Live Verification

**Files:**
- Modify: `README.md`

- [ ] Run `npm run seed`, start `npm run api`, and call `POST /api/demo/arm` twice.
- [ ] Assert distinct action and invoice identifiers, `Executed` status, duplicate proof, full transaction hashes, and `window_end - execution_time = 1_800_000` milliseconds.
- [ ] Challenge one armed action through `POST /api/challenge` and verify the other remains challengeable.
- [ ] Confirm all four hashes in `deployments/testnet.json`, with MockCsprUSD unchanged and the other three updated.
- [ ] Run tests, type checking, contract tests, secret scans, prohibited-name scans, and Git scope checks; commit locally without adding a remote.
