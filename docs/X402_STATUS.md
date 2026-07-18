# x402 status

Checked on 2026-07-18. Bondsman does not claim a settled x402 payment on Casper Testnet.

The x402 reference implementation describes a facilitator that verifies and settles supported payments. The public facilitator material we could verify lists EVM networks and Solana, but not Casper Testnet or a Casper asset settlement route. No official, publicly usable Casper Testnet facilitator endpoint, supported asset, or credential flow was located during this pass.

`POST /api/labs/x402-sandbox` is therefore a deliberately bounded protocol-shape sandbox. It returns `X402_SANDBOX`, validates the sandbox envelope format, and never returns a fabricated settlement transaction. The legacy `/api/verify` alias remains only for compatibility and has the same sandbox code.

Real settlement becomes possible only when an official facilitator publishes all of: a Casper Testnet endpoint, a supported Casper asset and signature scheme, and any required public credentials or allowlist access.

Sources: [x402 protocol](https://github.com/x402-foundation/x402) and [facilitator implementation](https://github.com/second-state/x402-facilitator).
