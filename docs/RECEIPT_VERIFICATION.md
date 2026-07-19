# Receipt verification

Completed actions can be downloaded from `GET /api/receipt/:actionId`. Current portable receipts use `version: "3"` and `schemaId: "bondsman.portable-receipt.golden-path.v3"`. A receipt is signed with the dedicated public receipt signer recorded in `deployments/testnet.json`.

The signature covers the complete golden-path evidence relationship: action identity, controller, actor, principal, actual posted bond, quoted minimum bond semantics, fault class, verifier, outcome, challenger fields, watchdog challenge transaction, resolve transaction, economics, reasoning commitment, delivery evidence, x402 payment fields, and the paid quote consumed by the action.

```ts
import { createPublicKey, verify } from 'node:crypto';
const { signature, ...unsigned } = receipt;
const key = createPublicKey({ key: Buffer.from(unsigned.signerPublicKey, 'base64'), format: 'der', type: 'spki' });
const ok = verify(null, Buffer.from(JSON.stringify(unsigned)), key, Buffer.from(signature, 'base64'));
console.log(ok);
```

`GET /api/receipt/:actionId/verify` verifies the stored receipt. `POST` to that path accepts a portable receipt body for offline verification.
