import { describe, expect, it } from 'vitest';
import {
  fundingShortfall,
  isMissingPurse,
  transferableTopUp,
} from '../../src/casper/funding.js';

describe('fundingShortfall', () => {
  it('tops an account up to the target without overfunding it', () => {
    expect(fundingShortfall(20n, 100n)).toBe(80n);
    expect(fundingShortfall(100n, 100n)).toBe(0n);
    expect(fundingShortfall(120n, 100n)).toBe(0n);
  });
});

describe('transferableTopUp', () => {
  it('rounds a nonzero shortfall up to Casper minimum transfer', () => {
    expect(
      transferableTopUp(
        399_900_000_000n,
        400_000_000_000n,
      ),
    ).toBe(2_500_000_000n);
    expect(
      transferableTopUp(
        400_000_000_000n,
        400_000_000_000n,
      ),
    ).toBe(0n);
  });
});

describe('isMissingPurse', () => {
  it('recognizes a new account that has no purse yet', () => {
    expect(
      isMissingPurse({
        statusCode: -32026,
        message: 'Purse not found',
      }),
    ).toBe(true);
    expect(isMissingPurse(new Error('network timeout'))).toBe(false);
  });
});
