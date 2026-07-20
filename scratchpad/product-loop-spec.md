# Product Loop Redesign Phase 2 Implementation Contract

Date: 2026-07-20

## Primary user

A developer or operator building an autonomous financial agent on Casper.

## Primary job

Allow the agent to execute a consequential financial action while ensuring that an objectively provable failure has a predetermined economic consequence.

## Product definition

Bondsman is a bonded execution gateway. The user brings an intended action. Bondsman interprets risk, prices a deterministic minimum bond, issues a payer bound single use quote, accepts payer authorization, creates a bonded action, monitors delayed objective evidence, allows an independent watchdog to challenge, settles slash or refund, and issues a portable signed receipt.

## Default judge journey

1. Land on `/`.
2. Understand the product within 30 seconds.
3. Click `Replay a real slash`.
4. Open `/proof/27`.
5. Replay Action 27 without a wallet, payment, new transaction, or operator setup.
6. Verify the receipt.
7. Tamper with the receipt and see verification fail.
8. Open Build for HTTP, MCP, A2A, and threat model details.

## Developer journey

1. Land on `/`.
2. Click `Create bonded action`.
3. Open `/app/new`.
4. Choose `Delivery contradiction`.
5. Describe the intended action.
6. Run live assurance analysis.
7. Review deterministic policy and responsible parties.
8. Connect a payer wallet only at the paid quote step.
9. Receive the live 402 payment requirement.
10. Authorize the WCSPR x402 payment.
11. Receive a live payer bound quote.
12. Sign submit authorization.
13. Submit the paid quote exactly once.
14. Route to `/app/actions/[id]`.
15. Monitor action status, challenge window, receipt availability, and outcome.

## Role contract

| Role | Current source of truth | Product copy rule |
| --- | --- | --- |
| Payer | Connected Casper Wallet account from x402 payment receipt | Pays for quote and signs submit authorization. Does not fund bond in current architecture. |
| Acting agent | `deployment.accounts.agent` | Executes the bonded invoice action through backend controlled agent key. |
| Bond funder | Backend agent csprUSD balance | Funds the bond. Must not be described as the connected wallet. |
| Transaction submitter | Backend deployer and backend agent | Submits invoice, initiate, approve, post bond, execute transactions. |
| Gas funder | Backend deployer and backend agent | Funds gas for backend submitted transactions. |
| Evidence signer | Buyer public key supplied in `/app/new` | Signs delayed delivery contradiction evidence. |
| Watchdog | `deployment.accounts.watchdog` | Independently challenges objective failures. |
| Challenger | Watchdog for default delivery flow | Receives slash reward when challenge succeeds. |
| Receipt signer | Dedicated backend receipt signer | Signs portable receipts only after terminal resolution. |

## Wallet role

Wallet appears only inside `/app/new` Step 5 and later. It is not a global header control.

Supported wallet mode:

- Casper Wallet browser extension via `window.CasperWalletProvider`.
- Require `requestConnection`.
- Require `getActivePublicKey`.
- Require Ed25519 public key prefix `01`.
- Require `getActivePublicKeySupports()` to include `sign-typed-data-eip712` and `sign-message`.
- Use `signTypedData` for x402 WCSPR authorization.
- Use `signMessage` for submit authorization.

Unsupported wallet states:

- Wallet not installed.
- Wallet locked.
- Connection rejected.
- Active key changed.
- Wallet disconnected.
- Unsupported public key type.
- Missing typed data signing.
- Missing message signing.

Network copy:

- Required network is `casper:casper-test`.
- Wallet network is not a separate switch in the current provider API.
- The signed typed data domain and backend payment requirement bind the payment to Casper testnet.

## Route map

| Route | Purpose | Notes |
| --- | --- | --- |
| `/` | Product homepage | Explain product and direct to App or historical proof. |
| `/app` | Operational app home | Create action, recent browser action IDs, backend status, judge replay shortcut. |
| `/app/new` | Complete action creation journey | Staged policy, payment, authorization, action submit. |
| `/app/actions/[id]` | Action monitor and receipt | Poll public action detail and receipt state. |
| `/proof` | Historical proof library | Index with canonical Action 27 entry and compact proof system. |
| `/proof/27` | Canonical replay | Walletless historical Action 27 proof. |
| `/verify` | Portable receipt verifier | Paste or upload receipt and verify locally through backend verifier. |
| `/build` | Developer integration | Browser test mode and agent integration mode. |
| `/docs` | Deep docs | Not primary navigation. |

Primary navigation:

- Product
- App
- Proof
- Build

Header CTA:

- Create bonded action

No hover dropdown. No Design nav item. No persistent Proof Console CTA. No Connect Wallet in global header.

## `/app/new` screen states

### Step 1 Choose Policy

Default:

- Delivery contradiction

Advanced test vectors:

- Duplicate claim

Moved to Build blueprints:

- Treasury payment
- DEX execution
- x402 service delivery

### Step 2 Describe Intended Action

Fields:

- Principal amount.
- Agent confidence.
- Counterparty status.
- Objective evidence source.
- Maximum tolerated loss.
- Urgency.
- Buyer or evidence signer when required.

### Step 3 Calculate Policy

API:

- `POST /api/assurance/analyze`

Display:

- Risk factors.
- Model confidence.
- Recommended decision.
- Risk tier.
- Minimum bond.
- Basis points.
- Challenge window.
- Deployed verifier.
- Evidence requirements.

Authority boundary:

- AI interprets risk.
- Policy engine calculates minimum bond.
- Verifier checks evidence.
- Watchdog challenges.
- Contract slashes or refunds.

### Step 4 Review Responsible Parties

Before wallet connection, show:

- Payer: not connected yet.
- Acting agent: backend configured agent.
- Bond funder: backend agent balance.
- Transaction submitter: backend deployer and backend agent.
- Evidence signer: buyer key from form.
- Watchdog: backend watchdog account.

### Step 5 Connect Payer

CTA:

- Continue to paid quote

States:

- idle
- wallet unavailable
- connecting
- connected
- rejected
- locked
- unsupported key
- missing capability
- account changed
- disconnected

### Step 6 Payment Requirement

API:

- `POST /v1/actions/quote` without payment header.

Label:

- LIVE PAYMENT REQUIREMENT

Display:

- Payment amount.
- Asset.
- Network.
- Pay to.
- Timeout.
- Request timestamp.

Do not call this a paid quote.

### Step 7 Settle Payment

Mechanism:

- Build EIP 712 `TransferWithAuthorization` typed data from requirement.
- Ask wallet to `signTypedData`.
- Persist payment payload in session state before retry.
- Retry `POST /v1/actions/quote` with `PAYMENT-SIGNATURE`.

States:

- awaiting wallet approval
- user rejected
- signed
- submitted
- settlement pending
- settled
- failed
- insufficient WCSPR
- cancelled
- expired

Duplicate prevention:

- One payment payload per quote attempt.
- Disable new payment creation while pending.
- Require explicit reset before generating another payment authorization.

### Step 8 Receive Paid Quote

Label:

- LIVE PAYER BOUND QUOTE

Display:

- Quote hash.
- Payer.
- Expiry.
- Single use status.
- Minimum bond.
- Policy version.
- Fault class.
- Verifier.
- Challenge window.

### Step 9 Sign Authorization

Wallet method:

- `signMessage(canonicalSubmitAuthorizationJson, payerPublicKey)`

Human readable summary:

- Quote hash.
- Fault class.
- Amount.
- Evidence signer.
- Event type.
- Nonce.
- Timestamp.

States:

- ready
- awaiting wallet approval
- rejected
- signed
- expired
- account mismatch

### Step 10 Create Action

API:

- `POST /v1/actions/submit`

Submit once:

- Use a stable idempotency key.
- Disable button while pending.
- Persist local action creation state.

Display:

- Authorization accepted.
- Quote consumed.
- Action ID.
- Transaction hashes when available.
- Current state.

On success:

- Store action ID in local recent actions.
- Route to `/app/actions/[id]`.

## Action monitor states

Display only real state from backend:

- payment settled
- quote issued
- authorization accepted
- action created
- transaction submitted
- transaction included
- bond locked
- action executed
- challenge window open
- evidence received
- challenged
- resolved
- slashed
- refunded
- receipt issued

Mapping:

- `action.payment.status === "settled"` means payment settled.
- `action.payment.quoteHash` means quote issued.
- `action.transactions.initiate` means action transaction submitted.
- `action.transactions.postBond` means bond transaction available.
- `action.transactions.execute` means execution transaction available.
- `status: Executed` means challenge window open until `windowEnd`.
- `events` containing delivery attestation or challenge related events means evidence or challenge state.
- `status: ResolvedSlash` means slashed.
- `status: ResolvedRefund` means refunded.
- `receiptUrl !== null` means receipt can be fetched.

Polling:

- 5 seconds initially.
- Back off after repeated unchanged responses.
- Pause when tab hidden.
- Stop at `ResolvedSlash` or `ResolvedRefund`.
- Manual refresh always available.

## API map

| UI need | Endpoint | Method | Mutates |
| --- | --- | --- | --- |
| Backend status | `/api/health` | GET | No |
| Public capabilities | `/api/public-capabilities` | GET | No |
| Deployments and accounts | `/api/deployments` | GET | No |
| Assurance templates | `/api/assurance/templates` | GET | No |
| Assurance analysis | `/api/assurance/analyze` | POST | Design only |
| Payment requirement | `/v1/actions/quote` | POST without payment | No paid quote mutation |
| Paid quote | `/v1/actions/quote` | POST with payment | Yes, settles WCSPR and records quote |
| Submit action | `/v1/actions/submit` | POST | Yes, creates bonded action |
| Action monitor | `/api/actions/:id` | GET | No |
| Transaction status | `/api/transactions/:hash` | GET | No |
| Delivery evidence | `/api/delivery-attestation` | POST | Yes, stores signed evidence |
| Watchdog summary | `/api/watchdog` | GET | No |
| Receipt | `/api/receipt/:id` | GET | No chain mutation, may cache receipt |
| Receipt verify | `/api/receipt/:id/verify` | GET or POST | Verification only |
| Historical proof | `/api/proof/:id` | GET | No |
| Canonical replay | `/api/replay/canonical` | GET | No |
| Quote reuse check | `/api/replay/canonical/quote-check` | POST | Read only check |

## Live versus historical labels

Use one shared evidence label system:

- LIVE STATUS
- LIVE ANALYSIS
- LIVE POLICY
- LIVE PAYMENT REQUIREMENT
- LIVE TESTNET PAYMENT
- LIVE PAYER BOUND QUOTE
- LIVE TESTNET ACTION
- LIVE VERIFICATION
- REAL HISTORICAL ACTION
- CONTROLLED TESTNET INPUT
- CONTROLLED TAMPER TEST
- DESIGN ARTIFACT
- BLUEPRINT

Rules:

- `/app/new` and `/app/actions/[id]` use LIVE labels for current user flows.
- `/proof/27` always labels Action 27 as REAL HISTORICAL CASPER TESTNET ACTION.
- `/verify` uses LIVE VERIFICATION for a verifier response and CONTROLLED TAMPER TEST for local modifications.
- Blueprints never imply deployed execution.

## Error states

Global:

- Backend unreachable.
- Backend timeout.
- Malformed API response.
- Route load failed.
- Hydration or runtime error.

Wallet:

- Wallet not installed.
- Wallet locked.
- Connection rejected.
- Account changed during payment.
- Disconnected during payment.
- Unsupported public key.
- Missing capability.

Payment:

- Requirement unavailable.
- User rejected typed data.
- Insufficient WCSPR.
- Settlement timeout.
- Settlement failed.
- Expired payment authorization.
- Duplicate payment attempt blocked.

Quote:

- Quote expired.
- Quote payer missing.
- Quote fault class mismatch.
- Quote already consumed.
- Quote policy stale.

Authorization:

- User rejected message signature.
- Signature invalid.
- Authorization expired.
- Payer mismatch.
- Nonce replay.

Submit:

- Double submit blocked.
- Backend unavailable after payment.
- Quote reservation failed.
- Action creation failed.

Monitor:

- Action not found.
- Transaction pending.
- Transaction failed.
- Receipt pending.
- Receipt unavailable.

## Loading states

- Root route loading shell with preserved navigation.
- `/app` loading status cards.
- `/app/new` step level skeletons.
- `/app/actions/[id]` monitor skeleton with manual refresh.
- `/proof/27` cached historical proof fallback.
- `/verify` verifier pending state.
- `/build` documentation skeleton.

No route may become a blank grey page.

## Security boundaries

- No private key enters browser.
- No operator token enters browser.
- No browser route calls operator protected endpoints.
- No old demo arm route is exposed.
- No public wallet challenge bounty is restored.
- Browsing and polling never submit transactions.
- Payment retry must not generate a second authorization without explicit user action.
- Submit must use a stable idempotency key and one disabled pending control.
- Copy must distinguish payer, acting agent, bond funder, and submitter.
- The connected wallet must never be described as posting the bond under the current backend.

## Definition of done for implementation phases

- New visitor understands Bondsman within 30 seconds.
- Primary navigation is Product, App, Proof, Build.
- `/app` and `/app/new` exist and are operational.
- Assurance analysis continues into payment and execution.
- Wallet appears only inside execution journey.
- Live 402 payment requirement is shown before payment.
- Paid quote is real and payer bound.
- Submit authorization is real and human readable.
- Action creation returns an action ID.
- Action monitor distinguishes all major states.
- Receipt retrieval and verification work.
- Historical proof is clearly historical.
- Action 27 is not the product shell.
- Hero animation runs once, holds final state, and has replay.
- New logo is applied everywhere required.
- Build page separates browser test mode from agent integration mode.
- Loading, error, and direct route states are reliable.
- Mobile and desktop are polished.
- Tests pass or missing scripts are reported honestly.
- Preview deployment is not promoted to production.
