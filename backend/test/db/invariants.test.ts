import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';

describe('projection invariants', () => {
  it('binds delivery evidence to one action and never changes a settled action identity', () => {
    const repository = new Repository(openDatabase(':memory:'));
    repository.upsertDeliveryAttestation({
      evidenceRoot: '0xabc', invoiceId: 1, actionId: 9, eventType: 'delivery_rejected', occurredAt: 1,
      buyerPublicKey: 'key', signature: 'signature', payload: { actionId: 9 }, receivedAt: 2, usedActionId: null,
    });
    expect(repository.useDeliveryEvidence('0xabc', 9)).toBe(true);
    expect(repository.useDeliveryEvidence('0xabc', 10)).toBe(false);
  });
});
