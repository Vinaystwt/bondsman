# Threat model

| Threat | Current mitigation | Residual risk |
| --- | --- | --- |
| Malicious approver | Risk-weighted bond, challenge window, on-chain duplicate proof | Bond is less than full payout value. |
| False challenger | Duplicate proof is checked by the controller before slash | Challenge transaction gas can be used for griefing. |
| Colluding approver and challenger | Slash split and public evidence expose the behavior | The protocol does not infer collusion. |
| Forged delivery evidence | Ed25519 signature verification and public-key binding | Delivery enforcement needs the parallel controller suite. |
| Evidence replay | Root, action id, nonce, and one-use storage | Storage is backend projection until the new suite commits it on chain. |
| Stale attestation | Occurrence time and challenge-window checks | Clock quality comes from the signed fixture. |
| Operational key compromise | Separate deployer, agent, challenger, watchdog, integrator, and receipt signer keys | Key rotation and hardware custody are future work. |
| Insufficient bond or reserve | Coverage API discloses bond and reserve exposure | It is not full insurance. |
| Indexer lag | Listener cursor and freshness state; chain remains source of truth | API can lag while RPC/SSE is unavailable. |
| Finality delay | Jobs report transaction hashes and await Casper finality | Testnet latency remains variable. |
| Owner constrains the agent | Reasoning hash and public transactions make omissions visible | Owner retains invoice submission authority. |
| Verifier bug | Small verifier schemas, tests, and explicit on-chain capability declaration | New verifier suites require independent audit. |
