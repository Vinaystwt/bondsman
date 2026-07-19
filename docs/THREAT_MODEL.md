# Threat model

| Threat | Current mitigation | Residual risk |
| --- | --- | --- |
| Malicious approver | Risk-weighted bond, challenge window, on-chain duplicate proof | Bond is less than full payout value. |
| False challenger | Duplicate proof is checked by the controller before slash | Challenge transaction gas can be used for griefing. |
| Colluding approver and challenger | Slash split and public evidence expose the behavior | The protocol does not infer collusion. |
| Forged delivery evidence | Ed25519 signature verification, buyer public-key binding, action binding, and on-chain verifier checks | Wallet-submitted delivery disputes still need broader live traffic before being promoted from experimental. |
| Evidence replay | Root, action id, nonce, and one-use verifier storage | Backend projection lag can briefly hide the latest verifier outcome from the API. |
| Stale attestation | Occurrence time and challenge-window checks | Clock quality comes from the signed fixture. |
| Operational key compromise | Separate deployer, agent, challenger, watchdog, integrator, and receipt signer keys | Key rotation and hardware custody are future work. |
| Insufficient bond or reserve | Coverage API discloses bond and reserve exposure | It is not full insurance. |
| Indexer lag | Listener cursor and freshness state; chain remains source of truth | API can lag while RPC/SSE is unavailable. |
| Finality delay | Jobs report transaction hashes and await Casper finality | Testnet latency remains variable. |
| Owner constrains the agent | Reasoning hash and public transactions make omissions visible | Owner retains invoice submission authority. |
| Verifier bug | Small verifier schemas, tests, and explicit on-chain capability declaration | New verifier suites require independent audit. |
| Operator overspend | Per-account transaction budgets, spend telemetry, and a circuit breaker before contract submission | In-process limits reset on process restart; account balances remain the source of truth. |
| Mutating endpoint abuse | Operator bearer token on challenge, resolve, demo arm, watchdog demo, jobs, spend telemetry, recent errors, and wallet resolution; CORS allowlist, per-minute rate limits, idempotency headers, and structured error logs | Paid submit remains public by design, but requires settled x402 quote and payer submit authorization. |
| Assurance prompt abuse | Strict schema, bounded fields, rate limit, no tool execution by the model, deterministic fallback, and manifest boundaries stating no transaction/payment/challenge/settlement | Model output is advisory and not accepted as verifier evidence. |
| Canonical evidence drift | Health validates frozen Action 27, consumed quote, watchdog slash, receipt validity, and challenge/resolve transactions; exporter refuses unready live projection | The committed bundle is a fallback if the live projection is unavailable, so operators must regenerate it only from validated canonical state. |
