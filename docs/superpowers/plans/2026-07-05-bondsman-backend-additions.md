# Bondsman Backend Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authenticated low-latency reads, an autonomous watchdog,
frontend-ready API projection data, MCP tools, and metered verification without
changing deployed contracts.

**Architecture:** Extend the existing TypeScript services and SQLite
projection with small focused modules. Reuse current Casper transaction helpers
and demo action flow, while giving each signing account an independent
serialized queue.

**Tech Stack:** Node.js, TypeScript, Fastify, SQLite, Casper JS SDK, MCP
TypeScript SDK, Vitest.

---

### Task 1: CSPR.cloud transport and listener wakeups

**Files:**
- Modify: `backend/src/config/env.ts`
- Modify: `backend/src/casper/rpc.ts`
- Create: `backend/src/listener/event-stream.ts`
- Modify: `backend/src/listener/main.ts`
- Test: `backend/test/config/env.test.ts`
- Test: `backend/test/casper/rpc.test.ts`
- Test: `backend/test/listener/event-stream.test.ts`

- [ ] Write failing tests asserting the official CSPR.cloud RPC/SSE endpoints,
  raw authorization header, public fallback, and streamed-event wakeups.
- [ ] Run the focused tests and confirm they fail for missing behavior.
- [ ] Implement retryable RPC reads and an SSE wakeup source with public-node
  fallback.
- [ ] Run focused tests, the full TypeScript suite, and typecheck.
- [ ] Commit as `feat/cspr-cloud`.

### Task 2: Watchdog account

**Files:**
- Modify: `backend/src/casper/keys.ts`
- Modify: `backend/src/shared/deployment.ts`
- Modify: `deployments/testnet.json`
- Test: `backend/test/casper/keys.test.ts`
- Test: `backend/test/casper/deployment.test.ts`

- [ ] Write failing tests for an idempotent named watchdog key and deployment
  metadata.
- [ ] Run focused tests and confirm the expected failures.
- [ ] Generate `.keys/watchdog.pem`, fund its public account from the deployer,
  and persist only public metadata.
- [ ] Run focused tests and typecheck.
- [ ] Commit as `feat/watchdog-account`.

### Task 3: Watchdog daemon

**Files:**
- Modify: `backend/src/db/schema.ts`
- Modify: `backend/src/db/database.ts`
- Modify: `backend/src/db/repositories.ts`
- Create: `backend/src/casper/signer-queue.ts`
- Create: `backend/src/watchdog/detection.ts`
- Create: `backend/src/watchdog/reasoning.ts`
- Create: `backend/src/watchdog/service.ts`
- Create: `backend/src/watchdog/main.ts`
- Modify: `backend/package.json`
- Modify: `package.json`
- Test: `backend/test/watchdog/detection.test.ts`
- Test: `backend/test/watchdog/service.test.ts`
- Test: `backend/test/db/database.test.ts`

- [ ] Write failing tests proving duplicate selection, clean exclusion,
  reserved exclusion, expired exclusion, serialized operations, and idempotent
  catch totals.
- [ ] Run focused tests and confirm each fails for missing behavior.
- [ ] Add additive projection columns, catch persistence, detector, delayed
  signer service, startup funding, and daemon entrypoint.
- [ ] Run focused tests, full suite, and typecheck.
- [ ] Commit as `feat/watchdog-agent`.

### Task 4: Watchdog API

**Files:**
- Modify: `backend/src/api/arm.ts`
- Modify: `backend/src/api/resolution.ts`
- Modify: `backend/src/api/routes.ts`
- Modify: `backend/src/api/server.ts`
- Modify: `backend/src/api/main.ts`
- Modify: `README.md`
- Test: `backend/test/api/arm.test.ts`
- Test: `backend/test/api/routes.test.ts`

- [ ] Write failing tests for action metadata, reserved human arms, non-reserved
  watchdog arms, watchdog status, and queued manual challenge behavior.
- [ ] Run focused tests and confirm expected failures.
- [ ] Parameterize the arm flow, register the new routes, expose watchdog
  status, and document response examples.
- [ ] Run focused tests, full suite, and typecheck.
- [ ] Commit as `feat/watchdog-api`.

### Task 5: MCP stdio server

**Files:**
- Create: `backend/src/mcp/tools.ts`
- Create: `backend/src/mcp/main.ts`
- Modify: `backend/package.json`
- Modify: `package.json`
- Modify: `README.md`
- Test: `backend/test/mcp/tools.test.ts`

- [ ] Write failing handler tests for every required read and transaction tool.
- [ ] Run the focused tests and confirm missing handlers fail.
- [ ] Install the pinned standard MCP TypeScript SDK and implement the stdio
  server over existing repositories and transaction services.
- [ ] Exercise the server with an MCP client, run full tests and typecheck.
- [ ] Commit as `feat/mcp-server`.

### Task 6: Metered verification

**Files:**
- Create: `backend/src/verify/payment.ts`
- Create: `backend/src/verify/service.ts`
- Modify: `backend/src/api/routes.ts`
- Modify: `backend/src/api/server.ts`
- Modify: `backend/src/api/main.ts`
- Modify: `README.md`
- Test: `backend/test/verify/payment.test.ts`
- Test: `backend/test/api/routes.test.ts`

- [ ] Probe primary Casper and x402 sources plus reachable facilitator
  capability endpoints.
- [ ] Write failing tests for the selected live or labeled sandbox behavior,
  payment-required response, accepted header shape, and collision result.
- [ ] Implement the minimal verified path without claiming unavailable
  settlement.
- [ ] Run focused tests, full suite, and typecheck.
- [ ] Commit as `feat/x402-verify`.

### Task 7: Live testnet evidence

**Files:**
- Modify only ignored `.data/` evidence files if produced by existing services.

- [ ] Start listener, API, and watchdog with the ignored environment.
- [ ] Arm a reserved action and confirm it remains executed and unchallenged.
- [ ] Trigger a watchdog demo, wait for autonomous detection, and capture its
  real challenge and resolution hashes.
- [ ] Confirm API projection reaches slash resolution within seconds.
- [ ] Run a clean full test suite and typecheck, audit staged files for secrets,
  inspect local commit order, and confirm no remote was touched.
