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

export function canonicalDeliveryPayload(input: DeliveryAttestationInput): string {
  return JSON.stringify({
    actionId: input.actionId,
    eventType: input.eventType,
    invoiceId: input.invoiceId,
    nonce: input.nonce,
    occurredAt: input.occurredAt,
  });
}

function publicKeyFromBase64(value: string) {
  return createPublicKey({
    key: Buffer.from(value, 'base64'),
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
      Buffer.from(payload),
      publicKeyFromBase64(input.buyerPublicKey),
      Buffer.from(input.signature, 'base64'),
    );
  } catch {
    valid = false;
  }
  if (!valid) throw new Error('delivery attestation signature is invalid');
  const evidenceRoot = `0x${createHash('blake2b512').update(payload).digest('hex').slice(0, 64)}`;
  return {
    evidenceRoot,
    invoiceId: input.invoiceId,
    actionId: input.actionId,
    eventType: input.eventType,
    occurredAt: input.occurredAt,
    buyerPublicKey: input.buyerPublicKey,
    signature: input.signature,
    payload: JSON.parse(payload) as Record<string, unknown>,
    receivedAt: Date.now(),
    usedActionId: null,
  };
}
