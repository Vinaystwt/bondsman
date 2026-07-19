# Integrating Bondsman

1. Discover the agent card at `https://bondsman-backend-production.up.railway.app/.well-known/agent.json`.
2. Connect an MCP client to `https://bondsman-backend-production.up.railway.app/mcp`, then call `get_deployments` and `get_action`.
3. Read `GET /api/verifiers` and select a supported fault class.
4. For design-only planning, call `GET /api/assurance/templates`, `GET /api/assurance/schema`, and `POST /api/assurance/analyze`. These calls do not pay, challenge, settle, or submit Casper transactions.
5. For proof evaluation, call `GET /api/proofs/canonical`, `GET /api/replay/canonical`, `POST /api/replay/canonical/quote-check`, and `GET /api/receipt/27/verify`.
6. Request a paid quote from `POST /v1/actions/quote`. A request without `PAYMENT-SIGNATURE` returns HTTP 402 with Casper x402 payment requirements and does not mutate protocol state; retry with `PAYMENT-SIGNATURE` only when you intend to settle WCSPR.
7. Submit the paid quote to `POST /v1/actions/submit` with `quoteHash`, `faultClass`, delivery attestation metadata when using `delivery_contradiction`, and `submitAuthorization`. The authorization is an Ed25519 Casper-key signature from the same account hash reported as the x402 payer; it covers the quote hash, fault class, buyer public key when present, event type, timestamp, and nonce. Each paid quote can create exactly one bonded action, and submit authorization nonces are one-use.
8. For a completed action, fetch `/api/proof/:id` and `/api/receipt/:id`, then verify the receipt locally.

For a sandbox payment-shape exercise, post to `/api/labs/x402-sandbox`. A missing envelope receives HTTP 402 and `X402_SANDBOX`; an accepted envelope has no on-chain payment receipt. See `X402_STATUS.md`.

The local package remains available with `npm install -g @vinaystwt/bondsman-mcp`. Production MCP no longer exposes backend-sponsored public challenges. Challenge, resolve, demo arm, watchdog demo, job status, spend telemetry, and recent errors are operator-only HTTP surfaces protected by `OPERATOR_API_TOKEN`.
