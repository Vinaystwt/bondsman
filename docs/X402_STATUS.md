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

## Current funding note

The integrator account currently has no indexed WCSPR balance. Until WCSPR is swapped or transferred into the integrator account, live settlement will fail honestly with the facilitator reason instead of returning a fabricated receipt.

## Reference sandbox

`POST /api/labs/x402-sandbox` remains available as a protocol shape reference. It returns `X402_SANDBOX`, validates the old sandbox envelope format, and never reports an on-chain settlement. The legacy `/api/verify` alias remains for compatibility and uses the same reference path.

Sources: [CSPR.cloud x402 facilitator reference](https://docs.cspr.cloud/x402-facilitator-api/reference.md), [CSPR.cloud supported endpoint](https://docs.cspr.cloud/x402-facilitator-api/supported.md), and [make-software/casper-x402](https://github.com/make-software/casper-x402).
