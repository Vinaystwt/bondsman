# Judging Evidence

Public judging should use the proof, replay, quote probe, and receipt surfaces. Backend-sponsored fresh demo writes are operator-only.

## Public Checks

| Check | Endpoint |
| --- | --- |
| Health | `GET /api/health` |
| Capabilities | `GET /api/public-capabilities` |
| Canonical proof | `GET /api/proofs/canonical` |
| Canonical replay | `GET /api/replay/canonical` |
| Quote replay check | `POST /api/replay/canonical/quote-check` |
| Receipt | `GET /api/receipt/27` |
| Receipt verification | `GET /api/receipt/27/verify` |
| Tamper verification | `POST /api/receipt/27/verify` |
| Assurance templates | `GET /api/assurance/templates` |
| Assurance analyze | `POST /api/assurance/analyze` |
| x402 quote probe | `POST /v1/actions/quote` with no payment, expecting HTTP 402 |

## Canonical Action 27

Action 27 is the frozen canonical proof. It must remain a `ResolvedSlash` delivery-contradiction action challenged by the watchdog. Its paid quote must be consumed by action 27, and its receipt must verify.

The committed fallback bundle is generated with:

```bash
npm run canonical:export
```

The exporter reads the local projection and receipt signer, validates Action 27, computes a stable checksum, and writes `docs/CANONICAL_ACTION_27_BUNDLE.json`. It does not call Casper RPC or submit transactions.
