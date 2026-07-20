# Product Loop Redesign Phase 1 Technical Feasibility

Date: 2026-07-20
Decision: feasible with constraints

## Decision gate

Chosen implementation mode: **Browser wallet paid execution**.

This is feasible for Casper Wallet browser accounts that:

- expose `window.CasperWalletProvider`;
- connect through `requestConnection`;
- return an Ed25519 active public key beginning with `01`;
- support `sign-typed-data-eip712` for the WCSPR x402 authorization;
- support `sign-message` for the payer submit authorization.

The UI must reject unsupported key types or missing wallet capabilities before payment. The fallback for unsupported wallets should be a guided paid HTTP integration path, not a fake success simulation.

No backend or contract correction is required before implementation. Small frontend work is required for wallet capability detection, x402 payload construction, submit authorization signing, paid quote parsing, action submit, polling, and safe persistence.

## External sources checked

- Casper Wallet SDK README, `window.CasperWalletProvider`, `requestConnection`, `getActivePublicKey`, `getActivePublicKeySupports`, `sign`, `signMessage`, `signTypedData`, and wallet events: https://github.com/make-software/casper-wallet-sdk
- Casper frontend dapp docs for wallet connection and transaction signing: https://docs.casper.network/next/developers/dapps/template-frontend
- Local `@make-software/casper-x402` package README and type files in `node_modules/@make-software/casper-x402`.
- CSPR.cloud x402 facilitator docs linked from `docs/X402_STATUS.md`.

## Live read checks performed

No transaction was submitted. No payment was settled.

- `GET https://bondsman-backend-production.up.railway.app/api/health` returned version `0.2.0`, controller V2, canonical proof ready, receipt valid, live quote probe available, public mutation modes disabled, watchdog running.
- Unpaid `POST /v1/actions/quote` returned HTTP 402 with the live payment requirement and did not settle a payment.
- `GET /api/actions/27` returned `ResolvedSlash`, `delivery_contradiction`, paid quote `0x8c3401bd019bfca6ff9e9ce0497ddf495bb19719e27d935c7a724bb4d5deca5f`, settlement transaction `19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56`, and receipt URL `/api/receipt/27`.

## A. Wallet compatibility

Supported wallet: Casper Wallet browser extension through the injected Casper Wallet SDK.

Provider API:

```ts
const provider = window.CasperWalletProvider({ timeout });
await provider.requestConnection();
const publicKey = await provider.getActivePublicKey();
const supports = await provider.getActivePublicKeySupports();
```

Relevant support flags:

- `sign-typed-data-eip712`
- `sign-message`
- `sign-transactionv1`
- `sign-deploy`

Network status:

- Casper Wallet does not expose an EVM style "current chain" switch in the audited API.
- For x402, the network is bound by the EIP 712 typed data domain generated from the payment requirement, specifically `casper:casper-test`.
- For Casper transactions, the transaction JSON includes `chainName: casper-test`.
- The UI should display the required network and reject if the active capability set cannot sign typed data for that domain.

Active public key:

- `getActivePublicKey()` returns the active public key hex.
- The backend submit verifier only supports Ed25519 Casper keys. It rejects non Ed25519 keys despite the schema accepting `01|02|03`; see `backend/src/verify/submit-authorization.ts:40`.
- The UI must require `publicKey.startsWith("01")`.

Arbitrary payload signing:

- Casper Wallet exposes `signMessage(message, signingPublicKeyHex)`.
- The submit authorization message can be sent as the exact JSON string produced by the frontend equivalent of `canonicalSubmitAuthorizationPayload`.
- The returned signature must be converted to base64 raw bytes for the backend.

Casper transaction signing and submission:

- Wallet transaction signing is available with `provider.sign(transactionJson, publicKey)`.
- Current product submit does not require the browser wallet to sign or submit the bonded action Casper transactions.
- The backend creates the invoice, initiates the action, approves bond token allowance, posts bond, and executes with configured deployer and agent keys.

WCSPR CEP 18 transfers:

- The browser does not construct a normal CEP 18 transfer for the preferred x402 path.
- The browser signs the EIP 712 `TransferWithAuthorization` typed data. The CSPR.cloud facilitator verifies it, submits the CEP 18 `transfer_with_authorization` transaction, and waits for settlement.
- A direct browser CEP 18 call could be constructed with `casper-js-sdk` and signed via `provider.sign`, but that is not the current backend x402 contract.

## B. x402 browser payment

Quote request body:

```json
{
  "amount": "50000000000000",
  "faultClass": "delivery_contradiction"
}
```

Unpaid response:

```http
HTTP/1.1 402 Payment Required
PAYMENT-REQUIRED: <base64 JSON>
X-Payment-Required: <base64 JSON>
Content-Type: application/json
```

```json
{
  "success": false,
  "code": "X402_PAYMENT_REQUIRED",
  "message": "WCSPR payment is required for this quote",
  "payment": {
    "x402Version": 2,
    "accepts": [
      {
        "scheme": "exact",
        "network": "casper:casper-test",
        "payTo": "002cfb8f00d21230301310fc0d7633350ad7326d80b7f61561f77529dff71e918f",
        "amount": "100000000",
        "asset": "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e",
        "extra": {
          "name": "Wrapped CSPR",
          "symbol": "WCSPR",
          "version": "1",
          "decimals": "9"
        },
        "maxTimeoutSeconds": 900
      }
    ],
    "error": "payment required"
  }
}
```

Backend implementation references:

- `backend/src/api/routes.ts:588` parses the optional payment header and returns 402 when missing.
- `backend/src/verify/x402.ts:87` builds the exact Casper testnet payment requirement.
- `backend/src/verify/x402.ts:123` accepts either `payment-signature` or `x-payment`.
- `backend/src/verify/x402.ts:226` forwards `paymentPayload` and `paymentRequirements` to facilitator `/settle`.
- `backend/src/api/routes.ts:630` returns a `PAYMENT-RESPONSE` header after paid quote issuance.

Payment payload shape:

```json
{
  "x402Version": 2,
  "payload": {
    "signature": "<algorithm-prefixed hex signature>",
    "publicKey": "01<ed25519 public key hex>",
    "authorization": {
      "from": "00<payer account hash>",
      "to": "00<payee account hash>",
      "value": "100000000",
      "validAfter": "<unix seconds>",
      "validBefore": "<unix seconds>",
      "nonce": "<32 byte hex nonce>"
    }
  }
}
```

The current browser can construct the payment if the wallet supports `sign-typed-data-eip712`. The local `@make-software/casper-x402` package hashes the exact typed data but its public client signer interface accepts only `signEIP712(digest)`. Casper Wallet exposes `signTypedData`, not raw digest signing. Therefore the frontend should construct the same typed data and call `provider.signTypedData({ typedData, options }, publicKey)` directly, or wrap the library with a small adapter that preserves typed data before digesting.

Paid retry:

```http
POST /v1/actions/quote
Content-Type: application/json
PAYMENT-SIGNATURE: <base64 encoded x402 payment payload JSON>
```

On settlement success, the backend persists a paid quote and returns:

```json
{
  "actionType": "invoice_payout",
  "faultClass": "delivery_contradiction",
  "verifier": "delivery-contradiction-v2",
  "riskTier": "HIGH",
  "requiredBond": "2500000000000",
  "quotedMinimumBond": "2500000000000",
  "bondSemantics": "minimum_required_bond",
  "challengeWindow": 1800,
  "agentReputation": -20,
  "policyModule": "delivery-contradiction-v2",
  "policySnapshot": { "...": "..." },
  "quoteExpiry": "<ISO timestamp 15 minutes after issuance>",
  "quoteHash": "0x<64 hex>",
  "paymentReceipt": {
    "network": "casper-test",
    "asset": "WCSPR",
    "amount": "100000000",
    "transaction": "<64 hex transaction hash>",
    "facilitator": "x402-facilitator.cspr.cloud",
    "payer": "00<payer account hash>",
    "settled": true
  }
}
```

Settlement confirmation:

- The backend trusts CSPR.cloud `/settle` and requires `{ success: true, transaction: "<hash>" }`.
- It returns the paid quote only after that response.
- `maxTimeoutSeconds` is 900. The current frontend helper timeout is 30 seconds, which may be too short for real testnet settlement and must be extended for the paid step.

Payment failure:

- Missing or invalid payment: HTTP 402 with `X402_PAYMENT_REQUIRED`.
- Facilitator failure: HTTP 402 with `X402_SETTLEMENT_FAILED`.
- CEP 18 insufficient balance: HTTP 402 with `X402_INSUFFICIENT_WCSPR` and diagnostics for payer, amount, asset, recipient, and authorization expiry when available.

## C. Payer authorization

Submit schema from `backend/src/api/schemas.ts:25`:

```json
{
  "quoteHash": "0x<64 hex>",
  "faultClass": "delivery_contradiction",
  "buyerPublicKey": "<base64 32 byte buyer key>",
  "eventType": "goods_not_received",
  "submitAuthorization": {
    "publicKey": "01<ed25519 Casper public key hex>",
    "signature": "<base64 raw Ed25519 signature>",
    "timestamp": 1784457630418,
    "nonce": "<16 to 256 character random nonce>"
  }
}
```

Canonical bytes from `backend/src/verify/submit-authorization.ts:23`:

```json
{
  "quoteHash": "0x<64 hex>",
  "faultClass": "delivery_contradiction",
  "buyerPublicKey": "<base64 buyer key or null>",
  "eventType": "goods_not_received",
  "timestamp": 1784457630418,
  "nonce": "<nonce>"
}
```

Important details:

- Hashing algorithm for nonce storage: BLAKE2b 512 truncated to 32 bytes over `${payer}:${nonce}`.
- Signature verification: Node Ed25519 `verify(null, payload, publicKey, signature)`.
- Signature format expected by API: base64 raw signature bytes.
- Public key format: Casper public key hex with Ed25519 prefix `01`.
- Timestamp window: plus or minus 5 minutes.
- Quote binding: `quoteHash`.
- Fault class binding: `faultClass`.
- Evidence binding: `buyerPublicKey` and `eventType`.
- Replay protection: `submit_authorization_nonces` primary key and paid quote status.

Browser proof:

- Casper Wallet `signMessage(message, publicKey)` can sign the exact JSON string.
- The UI must present the human readable fields before signing and then submit the base64 signature.
- If `signMessage` returns hex, convert it to base64 bytes. If it returns a byte array, base64 encode that byte array.

## D. Action submission

Endpoint:

```http
POST /v1/actions/submit
Content-Type: application/json
Idempotency-Key: <stable key recommended>
```

Body is the submit schema above.

Backend flow:

- Load paid quote by `quoteHash`.
- Require status `paid`.
- Reject expired quote.
- Require matching fault class.
- Require `buyerPublicKey` for `delivery_contradiction`.
- Require quote payer.
- Recheck policy freshness and minimum bond relation.
- Verify payer submit authorization against the quote payer.
- Consume the submit nonce.
- Reserve the quote as `consuming`.
- Call `arm.submitPaidAction`.
- Mark the quote `consumed` with the returned `actionId`.
- Return action detail synchronously.

Submit success shape:

```json
{
  "success": true,
  "quoteHash": "0x<64 hex>",
  "quote": {
    "actionType": "invoice_payout",
    "faultClass": "delivery_contradiction",
    "verifier": "delivery-contradiction-v2",
    "requiredBond": "2500000000000",
    "quotedMinimumBond": "2500000000000",
    "expectedActualBond": "2500000000000",
    "policySource": "repository_projection",
    "bondEconomics": { "...": "..." },
    "paymentReceipt": {
      "network": "casper-test",
      "asset": "WCSPR",
      "amount": "100000000",
      "transaction": "<settlement tx>",
      "facilitator": "x402-facilitator.cspr.cloud",
      "payer": "00<payer account hash>",
      "settled": true
    }
  },
  "action": {
    "actionId": 9,
    "invoiceId": 1784457630418,
    "agent": "account-hash-<backend agent>",
    "amount": "50000000000000",
    "bondPosted": "2500000000000",
    "status": "Executed",
    "payment": { "...": "..." },
    "receiptUrl": null,
    "transactions": {
      "initiate": "<64 hex>",
      "approve": "<64 hex>",
      "postBond": "<64 hex>",
      "execute": "<64 hex>"
    },
    "explorerLinks": { "...": "..." },
    "attestation": {
      "actionId": 9,
      "invoiceId": 1784457630418,
      "eventType": "goods_not_received",
      "occurredAt": 1784457630418,
      "nonce": "<hex>",
      "buyerPublicKey": "<base64 key>"
    }
  }
}
```

Roles:

- Payer: connected wallet account that signs x402 payment and submit authorization.
- Acting agent: backend configured `deployment.accounts.agent`.
- Bond funder: backend agent account and its csprUSD balance.
- Transaction submitter: backend deployer for invoice submission and backend agent for initiate, approve, post bond, execute.
- Gas funder: backend deployer and backend agent. The paid browser wallet does not fund action gas or bond in the current backend.
- Evidence signer: buyer key supplied in the request for delivery contradiction.
- Watchdog: backend watchdog account.

The UI must never claim that the connected wallet funds the bond. It pays for the quote and authorizes action creation.

## E. Monitoring

Available endpoints:

- Action status and event projection: `GET /api/actions/:id`.
- Transaction status: `GET /api/transactions/:hash`.
- Watchdog summary: `GET /api/watchdog`.
- Receipt availability: `GET /api/actions/:id` via `receiptUrl`, then `GET /api/receipt/:id`.
- Receipt verification: `GET /api/receipt/:id/verify` and `POST /api/receipt/:id/verify`.
- Completed proof: `GET /api/proof/:id`.
- Canonical historical replay: `GET /api/replay/canonical`.
- Evidence input for delivery contradiction: `POST /api/delivery-attestation`.

Action states observed in code and contracts:

- `Initiated`
- `Bonded`
- `Executed`
- `Challenged`
- `ResolvedSlash`
- `ResolvedRefund`

Terminal states:

- `ResolvedSlash`
- `ResolvedRefund`

Temporary states:

- `Initiated`
- `Bonded`
- `Executed`
- `Challenged`

Polling recommendation:

- Start with 5 seconds while the submit result is fresh.
- Back off to 10, 20, then 30 seconds during long challenge windows.
- Pause while document is hidden.
- Stop on terminal states.
- Provide manual refresh.
- Do not poll every second indefinitely.

Indexing delay:

- `POST /v1/actions/submit` waits for backend action creation and returns an action detail synchronously.
- Event reconciliation may lag behind transaction finality, so the monitor must distinguish transaction hash availability from complete event availability.
- Newly created actions can be read publicly through `GET /api/actions/:id` once submit returns.

## F. Safety

Verified safe:

- No legacy public Arena route is needed.
- No public operator token is exposed.
- Browser never receives backend private keys.
- Unpaid quote request does not mutate `paid_quotes`.
- `paid_quotes.settlement_tx` is unique.
- `paid_quotes.consumed_action_id` is unique.
- Paid quote reservation uses status `paid` to `consuming`, then `consumed`.
- Submit authorization nonce is one use.
- Protected challenge, resolve, demo, ops, and wallet challenge routes require operator auth or are disabled by public flags.
- Browsing and polling use GET endpoints and do not mutate state.

Risks requiring frontend discipline:

- Generating a new x402 payment payload after a failed UI retry can authorize a second settlement. Persist one in flight payment payload and require explicit user action to generate another.
- Current frontend fetch timeout is 30 seconds. Paid settlement may exceed this. The paid payment step needs a longer timeout and a recoverable state.
- Backend paid submit uses configured backend keys and spend budgets for gas, invoice setup, action execution, and bond funding. This is not an old public demo route, but it is still a public paid mutation that consumes backend resources. The UI must label roles and the backend spend guard remains important.
- The submit verifier only supports Ed25519. The UI must reject Secp256k1 keys even if the wallet can sign typed x402 data.

## G. Deadline feasibility classification

| Capability | Classification | Notes |
| --- | --- | --- |
| Repository and asset audit | Ready now | Complete in Phase 0. |
| Assurance analysis | Ready now | Existing API and UI components. |
| Deterministic policy result | Ready now | Existing API response includes policy. |
| Browser wallet connection | Small frontend work | Casper Wallet provider and prior code available. |
| Active public key | Small frontend work | Use `getActivePublicKey`. |
| Wallet capability check | Small frontend work | Use `getActivePublicKeySupports`. |
| Testnet status | Small frontend work | Bind x402 typed data domain to `casper-test`; wallet has no separate network switch check. |
| x402 payment requirement | Ready now | Live 402 verified. |
| Browser x402 payment payload | Small frontend work | Use Casper Wallet `signTypedData` with exact WCSPR typed data. |
| Facilitator settlement | Ready now | Backend calls CSPR.cloud `/settle`. |
| Paid quote issuance | Ready now | Backend persists and returns quote after settlement. |
| Payer authorization | Small frontend work | Sign exact JSON with `signMessage`, Ed25519 only. |
| Paid action submit | Ready now | Backend route complete. |
| Action monitor | Small frontend work | Endpoint ready, frontend page missing. |
| Receipt retrieval | Ready now | Endpoint ready for terminal actions. |
| Receipt verification | Ready now | Endpoint and tamper lab exist. |
| Historical Action 27 replay | Ready now | Endpoint and existing UI. |
| Watchdog challenge monitoring | Small frontend work | Poll action, events, watchdog summary. |
| Direct wallet funded bond | Contract change required | Current contracts and backend use configured agent for bond funding. |
| Direct browser WCSPR transfer transaction for quote | Not required | x402 uses typed authorization plus facilitator. |
| Public wallet challenge bounty | Rejected | Must not restore. |
| Operator funded public demo execution | Rejected | Must not restore old routes. |

## Feasibility conclusion

Proceed with Browser wallet paid execution, constrained to Casper Wallet Ed25519 accounts with typed data and message signing support. The operational app can complete the real loop:

Intent to risk interpretation to deterministic policy to live 402 requirement to wallet authorized WCSPR x402 settlement to payer bound quote to payer submit authorization to backend created bonded action to action monitor to receipt.

The implementation contract must make the role split explicit: the payer wallet pays and authorizes, while the current backend agent acts, funds the bond, submits the Casper transactions, and the watchdog independently challenges objective failures.
