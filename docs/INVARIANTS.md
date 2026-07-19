# Contract and evidence invariants

The contract test suite exercises the core accounting properties: locked bonds settle once, a slash splits exactly into challenger and reserve shares, refunds never exceed the locked bond, an action cannot resolve twice, expired actions cannot execute, and the challenge window compares Casper block time in milliseconds.

The projection checks that a resolved slash updates reserve accounting from the chain event and preserves challenger identity after finality. The receipt and proof APIs are namespaced by controller hash so an action id from an earlier suite cannot be returned as current evidence.

Delivery evidence has a unique BLAKE2b root and is bound to one action with `used_action_id`. Reusing it for another action is rejected. Its signed payload includes the action id and a nonce, preventing an otherwise valid buyer attestation from being replayed across actions. The V2 delivery verifier also consumes matching evidence on chain.

Reputation remains a controller-owned value with the contract's tier floor. The backend reports it but does not calculate or override it.

Runtime safety invariants are enforced before transaction submission. Each configured signer has hourly and daily CSPR budgets; if a budget would be exceeded, the process reports `SPENDING_CIRCUIT_TRIPPED` and refuses new contract submissions from that signer until an operator intervenes or the window rolls forward.
