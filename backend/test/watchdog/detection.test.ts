import { describe, expect, it } from 'vitest';
import type { ActionRecord } from '../../src/db/repositories.js';
import { detectDuplicateActions } from '../../src/watchdog/detection.js';

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
