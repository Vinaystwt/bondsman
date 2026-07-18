# Receipt verification

Completed actions can be downloaded from `GET /api/receipt/:actionId`. A receipt is signed with the dedicated public receipt signer recorded in `deployments/testnet.json`.

```ts
import { createPublicKey, verify } from 'node:crypto';
const { signature, ...unsigned } = receipt;
const key = createPublicKey({ key: Buffer.from(unsigned.signerPublicKey, 'base64'), format: 'der', type: 'spki' });
const ok = verify(null, Buffer.from(JSON.stringify(unsigned)), key, Buffer.from(signature, 'base64'));
console.log(ok);
```

`GET /api/receipt/:actionId/verify` verifies the stored receipt. `POST` to that path accepts a portable receipt body for offline verification.
