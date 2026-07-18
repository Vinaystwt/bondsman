import { createPublicKey, generateKeyPairSync, sign } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonicalDeliveryPayload, verifyDeliveryAttestation } from '../../src/verifiers/delivery-attestation.js';

describe('delivery attestation verifier', () => {
  it('accepts a canonical signed rejection and derives stable evidence', () => {
    const keys = generateKeyPairSync('ed25519');
    const input = {
      invoiceId: 7, actionId: 42, eventType: 'goods_not_received' as const,
      occurredAt: 1_785_000_000_000, nonce: 'buyer-event-42',
      buyerPublicKey: createPublicKey(keys.privateKey).export({ type: 'spki', format: 'der' }).toString('base64'),
      signature: '',
    };
    input.signature = sign(null, Buffer.from(canonicalDeliveryPayload(input)), keys.privateKey).toString('base64');
    const attestation = verifyDeliveryAttestation(input);
    expect(attestation.evidenceRoot).toMatch(/^0x[0-9a-f]{64}$/);
    expect(attestation.usedActionId).toBeNull();
  });

  it('rejects a signature that does not cover the action binding', () => {
    const keys = generateKeyPairSync('ed25519');
    const input = {
      invoiceId: 7, actionId: 42, eventType: 'delivery_rejected' as const,
      occurredAt: 1_785_000_000_000, nonce: 'buyer-event-42',
      buyerPublicKey: createPublicKey(keys.privateKey).export({ type: 'spki', format: 'der' }).toString('base64'),
      signature: 'not-a-valid-signature',
    };
    expect(() => verifyDeliveryAttestation(input)).toThrow('signature is invalid');
  });
});
