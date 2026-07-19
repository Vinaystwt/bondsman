# x402 status

Checked on 2026-07-19. Bondsman now has a real Casper x402 quote path wired to the CSPR.cloud facilitator.

## Live path

`POST /v1/actions/quote` is the paid resource. A request without payment returns HTTP `402` and a `PAYMENT-REQUIRED` header. The requirement uses:

| Field | Value |
| --- | --- |
| Scheme | `exact` |
| Network | `casper:casper-test` |
| Asset | `WCSPR` |
| Asset package | `3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e` |
| Token name | `Wrapped CSPR` |
| Decimals | `9` |
| Default amount | `100000000` base units |
| Facilitator | `https://x402-facilitator.cspr.cloud` |

The client signs the Casper `TransferWithAuthorization` payload with the official `@make-software/casper-x402` package, retries with `PAYMENT-SIGNATURE`, and the backend forwards the payload to CSPR.cloud `/settle`. The quote response is returned only when the facilitator reports `success: true` and includes the settlement transaction hash.

The paid response is persisted in `paid_quotes`. `POST /v1/actions/submit` accepts a `quoteHash` and the intended `faultClass`, reserves the quote while the action is created, then marks it consumed with the resulting `actionId`. A consumed quote cannot be replayed for a second action. The default fault class is `delivery_contradiction`, which creates a V2 bonded delivery action and returns an attestation draft for buyer signature.

## Current funding note

The integrator account is funded with WCSPR on Casper Testnet. Direct dictionary lookup of the WCSPR balances dictionary shows `1000000000` base units for account hash `3b3362ea7af5776a37530df663afa7bc7c673ebcdd167f8934e2ac68d7eb9c77`. The funding mint is CSPR.cloud FT action transaction `0ac6541335c6a6055060cdb6fb9cadde46be324a8b7535203d29a4e7a67c4ff0`, timestamped `2026-07-19T10:29:02Z`.

If a payer lacks WCSPR, failed settlement is classified as `X402_INSUFFICIENT_WCSPR` when the facilitator or chain reports CEP 18 insufficient balance, including `User error: 60001`. The response includes diagnostics for the payer, required amount, authorized amount, asset, recipient, and authorization expiry when those fields are present.

## Reference sandbox

`POST /api/labs/x402-sandbox` remains available as a protocol shape reference. It returns `X402_SANDBOX`, validates the old sandbox envelope format, and never reports an on-chain settlement. The legacy `/api/verify` alias remains for compatibility and uses the same reference path.

Sources: [CSPR.cloud x402 facilitator reference](https://docs.cspr.cloud/x402-facilitator-api/reference.md), [CSPR.cloud supported endpoint](https://docs.cspr.cloud/x402-facilitator-api/supported.md), and [make-software/casper-x402](https://github.com/make-software/casper-x402).
