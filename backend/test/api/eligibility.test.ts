import { describe, expect, it } from 'vitest';
import type { ActionRecord } from '../../src/db/repositories.js';
import {
  challengeIneligibilityCode,
  isChallengeEligible,
} from '../../src/api/eligibility.js';

const controller = `hash-${'a'.repeat(64)}`;
const eligible: ActionRecord = {
  actionId: 1,
  invoiceId: 2,
  agent: 'account-hash-agent',
  amount: '1',
  claimHash: 'aa',
  reasoning: 'valid',
  reasoningHash: 'bb',
  bondRequired: '1',
  bondPosted: '1',
  windowEnd: 2_000,
  status: 'Executed',
  challenger: null,
  challengerType: null,
  controllerHash: controller,
  duplicateProven: true,
  reservedForManual: true,
  transactions: {},
};

describe('challenge eligibility', () => {
  it('requires current, executed, duplicate, unchallenged, unexpired state', () => {
    expect(isChallengeEligible(eligible, controller, 1_000)).toBe(true);
    for (const changed of [
      { status: 'Bonded' },
      { duplicateProven: false },
      { challenger: 'account-hash-challenger' },
      { windowEnd: 999 },
      { controllerHash: `hash-${'b'.repeat(64)}` },
    ]) {
      expect(
        isChallengeEligible({ ...eligible, ...changed }, controller, 1_000),
      ).toBe(false);
    }
  });

  it('reports stable machine-readable reasons', () => {
    expect(
      challengeIneligibilityCode(
        { ...eligible, windowEnd: 999 },
        controller,
        1_000,
      ),
    ).toBe('CHALLENGE_WINDOW_CLOSED');
    expect(
      challengeIneligibilityCode(
        { ...eligible, controllerHash: 'stale' },
        controller,
        1_000,
      ),
    ).toBe('STALE_CONTRACT_VERSION');
  });
});
