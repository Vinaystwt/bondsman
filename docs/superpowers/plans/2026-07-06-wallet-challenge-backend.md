# Wallet-Signed Challenge Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify a wallet-signed Casper challenge and safely resolve it while preserving the wallet as reward recipient.

**Architecture:** A focused transaction verifier parses Casper JSON-RPC data and validates the exact controller call. A wallet challenge service cross-checks controller state, resolves with the funded backend signer, reconciles, and returns event-derived rewards.

**Tech Stack:** TypeScript, Fastify, Casper JSON-RPC, casper-js-sdk, Vitest, SQLite.

---

### Task 1: Casper transaction verification

**Files:**
- Create: `backend/src/casper/transactions.ts`
- Create: `backend/test/casper/transactions.test.ts`

- [ ] Write failing tests for pending, failed, wrong-chain, wrong-target, wrong-entrypoint, wrong-action, and successful external-signer transactions.
- [ ] Run `npm --workspace backend test -- test/casper/transactions.test.ts` and confirm missing verifier failures.
- [ ] Implement raw `info_get_transaction` access and pure challenge-intent parsing.
- [ ] Run the focused tests and confirm they pass.
- [ ] Commit the verifier checkpoint.

### Task 2: Wallet challenge resolution service

**Files:**
- Create: `backend/src/api/wallet-challenge.ts`
- Create: `backend/test/api/wallet-challenge.test.ts`
- Modify: `backend/src/api/resolution.ts`

- [ ] Write failing tests proving pending challenges never resolve and external challengers remain reward recipients.
- [ ] Run the focused test and confirm failure before implementation.
- [ ] Add queued backend resolution, evidence persistence, immediate reconciliation, and event-derived reward splits.
- [ ] Run the focused tests and confirm they pass.
- [ ] Commit the service checkpoint.

### Task 3: REST endpoints and schemas

**Files:**
- Modify: `backend/src/api/schemas.ts`
- Modify: `backend/src/api/routes.ts`
- Modify: `backend/src/api/server.ts`
- Modify: `backend/src/api/main.ts`
- Modify: `backend/test/api/routes.test.ts`

- [ ] Write failing route tests for transaction status and wallet resolve response/error shapes.
- [ ] Run route tests and confirm missing endpoint failures.
- [ ] Register `GET /api/transactions/:hash` and `POST /api/challenge/wallet-resolve`.
- [ ] Run route tests, the full suite, and typecheck.
- [ ] Commit the API checkpoint.

### Task 4: Live external-wallet verification

**Files:**
- Modify: `README.md`

- [ ] Arm a fresh reserved duplicate through the existing endpoint.
- [ ] Fund a non-backend test key only if its CSPR balance is below the safe transaction threshold.
- [ ] Submit `challenge_action --action_id <id>` with that key and record the hash.
- [ ] Call the wallet-resolve endpoint and verify `ResolvedSlash`, `external-wallet`, wallet recipient, event-derived split, and explorer links.
- [ ] Confirm the backend-signed `/api/challenge` route remains covered and operational.
- [ ] Document request, response, deploy construction, and polling behavior.
- [ ] Run the full suite and typecheck, then commit documentation.
