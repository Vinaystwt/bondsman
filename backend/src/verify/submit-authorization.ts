import { createHash, createPublicKey, verify } from 'node:crypto';
import { PublicKey } from '../casper/sdk.js';

export interface SubmitAuthorizationFields {
  quoteHash: string;
  faultClass: 'duplicate_claim' | 'delivery_contradiction';
  buyerPublicKey?: string;
  eventType: 'delivery_rejected' | 'goods_not_received';
  timestamp: number;
  nonce: string;
}

export interface SubmitAuthorization {
  publicKey: string;
  signature: string;
  timestamp: number;
  nonce: string;
}

const ED25519_DER_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');
const MAX_AUTHORIZATION_AGE_MS = 5 * 60_000;

export function canonicalSubmitAuthorizationPayload(
  input: SubmitAuthorizationFields,
): Buffer {
  return Buffer.from(JSON.stringify({
    quoteHash: input.quoteHash,
    faultClass: input.faultClass,
    buyerPublicKey: input.buyerPublicKey ?? null,
    eventType: input.eventType,
    timestamp: input.timestamp,
    nonce: input.nonce,
  }));
}

export function payerFromCasperPublicKey(publicKeyHex: string): string {
  return `00${PublicKey.fromHex(publicKeyHex).accountHash().toHex()}`;
}

function ed25519PublicKey(publicKeyHex: string) {
  if (!/^01[0-9a-f]{64}$/i.test(publicKeyHex)) {
    throw new Error('only Ed25519 Casper submit keys are supported');
  }
  return createPublicKey({
    key: Buffer.concat([
      ED25519_DER_PREFIX,
      Buffer.from(publicKeyHex.slice(2), 'hex'),
    ]),
    format: 'der',
    type: 'spki',
  });
}

export function submitAuthorizationNonceHash(
  payer: string,
  nonce: string,
): string {
  return `0x${createHash('blake2b512')
    .update(`${payer}:${nonce}`)
    .digest('hex')
    .slice(0, 64)}`;
}

export function verifySubmitAuthorization(input: {
  authorization: SubmitAuthorization;
  fields: Omit<SubmitAuthorizationFields, 'timestamp' | 'nonce'>;
  expectedPayer: string;
  now?: number;
}): { payer: string; nonceHash: string } {
  const now = input.now ?? Date.now();
  if (Math.abs(now - input.authorization.timestamp) > MAX_AUTHORIZATION_AGE_MS) {
    throw new Error('submit authorization has expired');
  }
  const payer = payerFromCasperPublicKey(input.authorization.publicKey);
  if (payer.toLowerCase() !== input.expectedPayer.toLowerCase()) {
    throw new Error('submit authorization signer does not match x402 payer');
  }
  const payload = canonicalSubmitAuthorizationPayload({
    ...input.fields,
    timestamp: input.authorization.timestamp,
    nonce: input.authorization.nonce,
  });
  const valid = verify(
    null,
    payload,
    ed25519PublicKey(input.authorization.publicKey),
    Buffer.from(input.authorization.signature, 'base64'),
  );
  if (!valid) {
    throw new Error('submit authorization signature is invalid');
  }
  return {
    payer,
    nonceHash: submitAuthorizationNonceHash(payer, input.authorization.nonce),
  };
}
