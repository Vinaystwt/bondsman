import { describe, expect, it } from 'vitest';
import type {
  ActionRecord,
  DeliveryAttestationRecord,
} from '../../src/db/repositories.js';
import {
  detectDeliveryContradictions,
  detectDuplicateActions,
} from '../../src/watchdog/detection.js';

function action(
  actionId: number,
  claimHash: string,
  overrides: Partial<ActionRecord> = {},
): ActionRecord {
  return {
    actionId,
    invoiceId: actionId,
    agent: 'account-hash-agent',
    amount: '100',
    claimHash,
    reasoning: 'Delivered',
    reasoningHash: 'bb',
    bondRequired: '10',
    bondPosted: '10',
    windowEnd: 20_000,
    status: 'Executed',
    challenger: null,
    challengerType: null,
    duplicateProven: true,
    reservedForManual: false,
    transactions: {},
    ...overrides,
  };
}

describe('detectDuplicateActions', () => {
  it('flags a later executed action with a previously paid claim hash', () => {
    const result = detectDuplicateActions(
      [
        action(2, 'clean'),
        action(0, 'collision', { status: 'ResolvedRefund' }),
        action(1, 'collision'),
      ],
      10_000,
    );

    expect(result.map((candidate) => candidate.actionId)).toEqual([1]);
  });

  it('does not flag clean claims', () => {
    expect(
      detectDuplicateActions(
        [action(0, 'first'), action(1, 'second')],
        10_000,
      ),
    ).toEqual([]);
  });

  it('skips reserved, challenged, and expired duplicates', () => {
    const baseline = action(0, 'collision', {
      status: 'ResolvedRefund',
    });
    expect(
      detectDuplicateActions(
        [
          baseline,
          action(1, 'collision', { reservedForManual: true }),
          action(2, 'collision', {
            challenger: 'account-hash-human',
          }),
          action(3, 'collision', { windowEnd: 9_999 }),
        ],
        10_000,
      ),
    ).toEqual([]);
  });
});

describe('detectDeliveryContradictions', () => {
  const attestation: DeliveryAttestationRecord = {
    evidenceRoot: '0xabc',
    invoiceId: 1,
    actionId: 1,
    eventType: 'delivery_rejected',
    occurredAt: 11_000,
    buyerPublicKey: 'key',
    signature: 'signature',
    payload: { evidenceHex: 'aa'.repeat(120) },
    receivedAt: 12_000,
    usedActionId: null,
  };

  it('flags an executed unreserved action with unused verifier evidence', () => {
    const result = detectDeliveryContradictions(
      [action(1, 'claim', { duplicateProven: false })],
      () => attestation,
      10_000,
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.action.actionId).toBe(1);
    expect(result[0]!.evidence).toHaveLength(120);
  });

  it('skips expired, reserved, challenged, and already used evidence', () => {
    expect(
      detectDeliveryContradictions(
        [
          action(1, 'claim', { windowEnd: 9_999 }),
          action(2, 'claim', { reservedForManual: true }),
          action(3, 'claim', { challenger: 'account-hash-human' }),
          action(4, 'claim'),
        ],
        (actionId) =>
          actionId === 4
            ? { ...attestation, actionId, usedActionId: 99 }
            : attestation,
        10_000,
      ),
    ).toEqual([]);
  });
});
