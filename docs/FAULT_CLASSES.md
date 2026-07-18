# Fault classes

Bondsman has a verifier registry at `GET /api/verifiers`.

## Duplicate claim

The current Casper controller verifies this class on chain. `InvoicePool` records the first paid claim hash. A later executed action with the same paid hash is challengeable, and the controller confirms it before slashing.

Evidence schema: `actionId` and the action claim hash. The paid-claim registry is the source of truth.

## Delivery contradiction

This class models evidence that arrives after a payout: a buyer or logistics signer issues `delivery_rejected` or `goods_not_received`. The canonical signed JSON contains `actionId`, `invoiceId`, `eventType`, `occurredAt`, and a unique `nonce`. `POST /api/delivery-attestation` verifies an Ed25519 SPKI signature, computes a BLAKE2b-256 evidence root, and stores one action binding for replay prevention.

The current controller suite only accepts duplicate-claim challenges. Its vault controller reference is immutable, so it cannot truthfully slash delivery evidence. A parallel controller, vault, and pool suite must be deployed before `delivery_contradiction` can be marked on-chain. The registry exposes the class now to keep the evidence contract and API stable without overstating enforcement.

To add a verifier, define its canonical evidence schema, replay binding, confirmation rule, and whether the active controller can settle its result on-chain.
