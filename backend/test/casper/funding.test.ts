import { describe, expect, it } from 'vitest';
import {
  fundingShortfall,
  isMissingPurse,
} from '../../src/casper/funding.js';

describe('fundingShortfall', () => {
  it('tops an account up to the target without overfunding it', () => {
    expect(fundingShortfall(20n, 100n)).toBe(80n);
    expect(fundingShortfall(100n, 100n)).toBe(0n);
    expect(fundingShortfall(120n, 100n)).toBe(0n);
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
