import { createHash, createPublicKey, verify } from 'node:crypto';
import { z } from 'zod';
import type { DeliveryAttestationRecord } from '../db/repositories.js';

export const deliveryAttestationSchema = z.object({
  invoiceId: z.number().int().nonnegative(),
  actionId: z.number().int().nonnegative(),
  eventType: z.enum(['delivery_rejected', 'goods_not_received']),
  occurredAt: z.number().int().positive(),
  nonce: z.string().min(8).max(256),
  buyerPublicKey: z.string().min(16),
  signature: z.string().min(16),
}).strict();

export type DeliveryAttestationInput = z.infer<typeof deliveryAttestationSchema>;

function u64le(value: number): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

function nonceBytes(value: string): Buffer {
  if (/^[0-9a-f]{64}$/i.test(value)) {
    return Buffer.from(value, 'hex');
  }
  return createHash('blake2b512').update(value).digest().subarray(0, 32);
}

function rawPublicKey(value: string): Buffer {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length === 32) return decoded;
  return Buffer.from(
    publicKeyFromBase64(value).export({ type: 'spki', format: 'der' }),
  ).subarray(-32);
}

export function canonicalDeliveryPayload(input: DeliveryAttestationInput): Buffer {
  return Buffer.concat([
    u64le(input.actionId),
    u64le(input.invoiceId),
    u64le(input.occurredAt),
    nonceBytes(input.nonce),
  ]);
}

function publicKeyFromBase64(value: string) {
  const decoded = Buffer.from(value, 'base64');
  const key = decoded.length === 32
    ? Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        decoded,
      ])
    : decoded;
  return createPublicKey({
    key,
    format: 'der',
    type: 'spki',
  });
}

export function verifyDeliveryAttestation(input: DeliveryAttestationInput): DeliveryAttestationRecord {
  const payload = canonicalDeliveryPayload(input);
  let valid = false;
  try {
    valid = verify(
      null,
      payload,
      publicKeyFromBase64(input.buyerPublicKey),
      Buffer.from(input.signature, 'base64'),
    );
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('delivery attestation signature is invalid');
  const evidence = Buffer.concat([
    payload,
    Buffer.from(input.signature, 'base64'),
  ]);
  if (evidence.length !== 120) {
    throw new Error('delivery attestation evidence is invalid');
  }
  const evidenceRoot = `0x${createHash('blake2b512').update(evidence).digest('hex').slice(0, 64)}`;
  return {
    evidenceRoot,
    invoiceId: input.invoiceId,
    actionId: input.actionId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    buyerPublicKey: input.buyerPublicKey,
    signature: input.signature,
    payload: {
      actionId: input.actionId,
      eventType: input.eventType,
      invoiceId: input.invoiceId,
      nonce: input.nonce,
      occurredAt: input.occurredAt,
      buyerPublicKeyRawHex: rawPublicKey(input.buyerPublicKey).toString('hex'),
      evidenceHex: evidence.toString('hex'),
    },
    receivedAt: Date.now(),
    usedActionId: null,
  };
}
