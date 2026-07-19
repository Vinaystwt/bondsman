# Integrating Bondsman

1. Discover the agent card at `https://bondsman-backend-production.up.railway.app/.well-known/agent.json`.
2. Connect an MCP client to `https://bondsman-backend-production.up.railway.app/mcp`, then call `get_deployments` and `get_action`.
3. Read `GET /api/verifiers` and select a supported fault class.
4. Request a paid quote from `POST /v1/actions/quote`. The first request returns HTTP 402 with Casper x402 payment requirements; retry with `PAYMENT-SIGNATURE` to settle WCSPR.
5. Submit the paid quote to `POST /v1/actions/submit` with `quoteHash`, `faultClass`, delivery attestation metadata when using `delivery_contradiction`, and `submitAuthorization`. The authorization is an Ed25519 Casper-key signature from the same account hash reported as the x402 payer; it covers the quote hash, fault class, buyer public key when present, event type, timestamp, and nonce. Each paid quote can create exactly one bonded action, and submit authorization nonces are one-use.
6. For a completed action, fetch `/api/proof/:id` and `/api/receipt/:id`, then verify the receipt locally.

For a sandbox payment-shape exercise, post to `/api/labs/x402-sandbox`. A missing envelope receives HTTP 402 and `X402_SANDBOX`; an accepted envelope has no on-chain payment receipt. See `X402_STATUS.md`.

The local package remains available with `npm install -g @vinaystwt/bondsman-mcp`. The hosted endpoint is Streamable HTTP MCP and is useful when a client does not want to install the package.
