# Launch Plan

## Current Public Launch Surface

- Proof Console: canonical Action 27 proof, replay, receipt, and tamper verification.
- Assurance Studio: design-only manifest generation for executable and blueprint agent workflows.
- x402 quote probe: unpaid requests return HTTP 402 and do not mutate protocol state.
- Paid integration: `/v1/actions/quote` plus `/v1/actions/submit` remain available only to callers with real payment and submit authorization.
- MCP: read-only, design-only, verification, quote, and paid submit tools.

## Operator-Only Surface

The following routes require `Authorization: Bearer $OPERATOR_API_TOKEN`: challenge, resolve, demo arm, async demo arm, integrator run, watchdog demo, job status, ops spend, recent errors, and wallet challenge resolution. Production disables public legacy arena and wallet challenge modes.

## Mainnet Readiness Work

1. External audit of controller, vault, invoice pool, and verifier contracts.
2. Production csprUSD and WCSPR liquidity plan.
3. Hardware-backed custody and key rotation for operator accounts.
4. Design partner onboarding with fixed policy templates and verifier requirements.
5. Production monitoring for listener lag, watchdog heartbeat, spend budget, x402 settlement health, and canonical proof availability.
