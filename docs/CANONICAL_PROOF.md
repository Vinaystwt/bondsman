# Canonical proof action 27

Checked on 2026-07-19. This manifest records the accepted production evidence path for Bondsman action `27`. It is intentionally read-only: the commands below fetch public proof and receipt material and do not request a new quote, submit an action, settle x402 payment, challenge, or resolve.

## Public endpoints

Production backend: `https://bondsman-backend-production.up.railway.app`

Read-only reproduction:

```bash
BASE=https://bondsman-backend-production.up.railway.app
curl -fsS "$BASE/api/actions/27" | jq .
curl -fsS "$BASE/api/proof/27" | jq .
curl -fsS "$BASE/api/proofs/canonical" | jq .
curl -fsS "$BASE/api/proofs/featured" | jq '.[0]'
curl -fsS "$BASE/api/receipt/27" | jq .
curl -fsS "$BASE/api/receipt/27/verify" | jq .
```

Local verification without production mutation:

```bash
npm run typecheck
npm --workspace backend test
```

The unit tests use controlled fixtures for quote, receipt, attestation, and tamper cases. They are not a replacement for the action `27` production proof, and they do not initiate a paid settlement.

## Canonical transaction manifest

| Stage | Transaction | Expected observation |
| --- | --- | --- |
| WCSPR funding | `0ac6541335c6a6055060cdb6fb9cadde46be324a8b7535203d29a4e7a67c4ff0` | Successful Casper Testnet transaction that funded the integrator WCSPR balance. |
| x402 settlement | `19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56` | Successful x402 `exact` WCSPR settlement for the paid quote consumed by action `27`. |
| Watchdog challenge | `10c53143b07a7f9c8cd8ad6b6638d3454083a788ec3b739ad28af20b8abc4889` | Successful controller challenge transaction for action `27`, signed by the watchdog challenger. |
| Resolution | `7692d1954d6130149308161bb78b379dc58896f079dde2afc685d86fb94be16e` | Successful controller resolution transaction for action `27`; projection records `ResolvedSlashV2`. |

Explorer links:

- Funding: `https://testnet.cspr.live/transaction/0ac6541335c6a6055060cdb6fb9cadde46be324a8b7535203d29a4e7a67c4ff0`
- x402 settlement: `https://testnet.cspr.live/transaction/19523afd40fa295319df71684eed9e6ae2dbd13add64531bb2417365d2f3fd56`
- Challenge: `https://testnet.cspr.live/transaction/10c53143b07a7f9c8cd8ad6b6638d3454083a788ec3b739ad28af20b8abc4889`
- Resolve: `https://testnet.cspr.live/transaction/7692d1954d6130149308161bb78b379dc58896f079dde2afc685d86fb94be16e`

## Required proof shape

The canonical proof for action `27` must include:

- `proofSchemaVersion: 4`.
- `payment` with protocol `x402`, scheme `exact`, network `casper:casper-test`, asset `WCSPR`, amount, payer, pay-to account, facilitator, settlement transaction, and explorer link.
- `paidQuote` with `quoteHash`, verifier, `requiredBond`, `quotedMinimumBond`, `bondSemantics: "minimum_required_bond"`, quote expiry, status `consumed`, and `consumedActionId: 27`.
- `bondEconomics` proving the actual posted bond satisfies the quoted minimum.
- `deliveryAttestation` with buyer public key, evidence root, event type, occurrence time, received time, signature verification flag, and `usedActionId: 27`.
- `modelReasoning` with the original reasoning, committed hash, recomputed `blake2b256(reasoning)` hash, and `verifiedMatches`.
- `economicImpact` with challenger reward and reserve credit sourced from the chain event when projected, plus current reserve snapshot and reputation delta source.

Action `27` is intentionally not an exact quote/bond match. The paid quote committed `requiredBond: "2600000000000"` as the minimum required bond, while the controller posted `bond: "2800000000000"`. The canonical relation is `overcollateralized`, with `minimumSatisfied: true`, `exactMatch: false`, and `bondDifference: "200000000000"`. The proof console is ready when the actual posted bond is greater than or equal to the quoted minimum; it is invalid when the actual posted bond is below that minimum.

The canonical receipt for action `27` must have `version: "3"` and `schemaId: "bondsman.portable-receipt.golden-path.v3"`. Its signature covers action identity, controller, actor, principal, actual posted bond, quote minimum semantics, fault class, verifier, outcome, watchdog challenge, resolve transaction, chain-derived economics, reasoning commitment, delivery evidence, x402 settlement, and paid quote consumption. Changing the action id, settlement transaction, quote hash, or making the actual bond lower than the quoted minimum must fail receipt or canonical proof verification.

## Submit authorization model

The paid submit path requires a Casper Ed25519 submit authorization from the same account hash reported as the x402 payer. The signed payload covers quote hash, fault class, buyer public key when present, event type, timestamp, and nonce. Nonces are one-use across the payer, preventing a valid quote submit authorization from being replayed against a later paid quote.
