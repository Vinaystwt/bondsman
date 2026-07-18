# Integrating Bondsman

1. Discover the agent card at `https://bondsman-backend-production.up.railway.app/.well-known/agent.json`.
2. Connect an MCP client to `https://bondsman-backend-production.up.railway.app/mcp`, then call `get_deployments` and `get_action`.
3. Read `GET /api/verifiers` and select a supported fault class.
4. For a completed action, fetch `/api/proof/:id` and `/api/receipt/:id`, then verify the receipt locally.

For a sandbox payment-shape exercise, post to `/api/labs/x402-sandbox`. A missing envelope receives HTTP 402 and `X402_SANDBOX`; an accepted envelope has no on-chain payment receipt. See `X402_STATUS.md`.

The local package remains available with `npm install -g @vinaystwt/bondsman-mcp`. The hosted endpoint is Streamable HTTP MCP and is useful when a client does not want to install the package.
