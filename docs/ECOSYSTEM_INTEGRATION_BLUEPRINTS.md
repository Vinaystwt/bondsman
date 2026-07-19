# Ecosystem Integration Blueprints

## Invoice Delivery

Executable now. A buyer-signed delivery contradiction is bound to invoice id and action id. If the verifier accepts the contradiction, the bond is slashed.

## Duplicate Invoice Test

Executable now. A repeated paid claim hash proves duplicate payout. The controller resolves the challenge deterministically.

## Treasury Payment Guardrail

Blueprint. A DAO or treasury agent posts a bond before disbursement. Evidence could include approval quorum, allowlist, and policy receipt. Requires a treasury verifier before execution.

## DEX Execution Assurance

Blueprint. A trading agent posts a bond against slippage, stale route, or forbidden venue constraints. Requires route/oracle evidence and an execution verifier.

## x402 Service Delivery

Blueprint. After x402 payment, a service agent posts a bond against delivery failure. Requires SLA evidence, delivery attestation, and payer identity binding.
