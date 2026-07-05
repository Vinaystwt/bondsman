# Bondsman Backend Additions Design

## Scope

This change adds authenticated CSPR.cloud reads, an autonomous watchdog
challenger, API projection fields and routes, an MCP stdio server, and metered
claim verification. It does not modify Rust contracts, deployed contract
addresses, or frontend files.

## Architecture

Node access uses the authenticated CSPR.cloud testnet RPC endpoint and SSE
endpoint when `CSPR_CLOUD_API_KEY` is present. Each read operation can retry
against the public Casper testnet node. The listener keeps its authoritative
chain reconciliation and uses the event stream as a low-latency trigger, with
its existing interval as a recovery path.

SQLite remains the API projection. Action rows gain durable manual-reservation
and challenger-origin fields. A watchdog catches table stores transaction
evidence and reward totals. Schema migration is additive and safe for existing
projection databases.

The watchdog has a separate Ed25519 account and a single promise queue. Its
detector groups executed actions by claim hash, treats the earliest paid action
as the baseline, and selects later executed duplicates only when they are
unreserved, unchallenged, and still inside the challenge window. The daemon
waits `WATCHDOG_DELAY_MS`, submits challenge and resolution with the watchdog
key, immediately reconciles chain state, and persists the catch.

The existing demo arm service accepts a reservation mode. The human endpoint
creates reserved actions. The watchdog endpoint creates non-reserved actions
and returns the full projected record immediately.

The MCP server uses stdio and the standard TypeScript SDK. Read tools use the
same projection and live deployment metadata; bond requirement and challenge
tools use existing controller entry points. The challenge tool uses the manual
challenger queue.

Metered verification first probes the known facilitator ecosystem for Casper
testnet support. If no reliable Casper testnet facilitator is available, the
endpoint implements a plainly labeled sandbox gate using the requested Casper
headers and validates the Ed25519-shaped payment envelope without claiming
settlement.

## Failure Handling

Authenticated RPC or SSE failures fall back to the public node and remain
observable through concise logs. Watchdog failures leave an action eligible
for a later scan and never block other API routes. Reason generation is
non-blocking and has a deterministic template fallback. Catch insertion is
idempotent by action id.

## Verification

Unit tests cover cloud endpoint selection and fallback, duplicate selection,
reserved-action exclusion, catch persistence, API response fields, MCP tool
handlers, and payment-header validation. The final live pass starts the
listener, API, and watchdog; confirms a reserved human action remains
unchallenged; then creates a non-reserved duplicate and records real watchdog
challenge and resolution transaction hashes.
