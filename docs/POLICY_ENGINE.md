# Bondsman Policy Engine

The backend uses one deterministic policy engine for `/v1/actions/quote` and Assurance Studio manifest design.

## Formula

Amounts are integer strings with 9 decimals. Let `amount` be the action principal.

| Principal | Base bond |
| --- | --- |
| `< 10,000 * 1e9` | 200 bps |
| `>= 10,000 * 1e9` | 300 bps |
| `>= 50,000 * 1e9` | 500 bps |

If reputation is negative, add `min(abs(reputation), 300)` bps.

`bond = amount * (base_bps + reputation_penalty_bps) / 10,000`

Risk tiers are:

| Tier | Rule |
| --- | --- |
| `standard` | below elevated thresholds |
| `elevated` | amount at least `10,000 * 1e9` or bps at least 300 |
| `high` | amount at least `50,000 * 1e9` or bps at least 500 |

The challenge window is 1,800 seconds. Current executable verifiers are `duplicate-claim-v2` and `delivery-contradiction-v2`.

## Executable vs Blueprint

`invoice_delivery` and `duplicate_invoice_test` are executable now. Treasury, DEX, and x402 service-delivery templates are blueprints. Blueprint manifests still price risk, but mark the verifier as proposed and do not claim submit capability.
