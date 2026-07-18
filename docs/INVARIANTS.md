# Contract and evidence invariants

The contract test suite exercises the core accounting properties: locked bonds settle once, a slash splits exactly into challenger and reserve shares, refunds never exceed the locked bond, an action cannot resolve twice, and expired actions cannot execute.

The projection checks that a resolved slash updates reserve accounting from the chain event and preserves challenger identity after finality. The receipt and proof APIs are namespaced by controller hash so an action id from an earlier suite cannot be returned as current evidence.

Delivery evidence has a unique BLAKE2b root and is bound to one action with `used_action_id`. Reusing it for another action is rejected. Its signed payload includes the action id and a nonce, preventing an otherwise valid buyer attestation from being replayed across actions.

Reputation remains a controller-owned value with the contract's tier floor. The backend reports it but does not calculate or override it.
