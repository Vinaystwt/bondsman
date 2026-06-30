import { describe, expect, it } from 'vitest';
import {
  assertChallengeWindow,
  createInvoiceIdGenerator,
  isTransientRpcError,
} from '../../src/api/arm.js';

describe('createInvoiceIdGenerator', () => {
  it('returns distinct increasing identifiers when time does not move', () => {
    const next = createInvoiceIdGenerator(() => 2_000_000_000_000);
    expect(next()).toBe(2_000_000_000_000);
    expect(next()).toBe(2_000_000_000_001);
    expect(next()).toBe(2_000_000_000_002);
  });
});

describe('isTransientRpcError', () => {
  it('recognizes transport failures without treating contract reverts as transient', () => {
    expect(
      isTransientRpcError(
        new Error('failed to get response: error sending request'),
      ),
    ).toBe(true);
    expect(
      isTransientRpcError(new Error('contract reverted: NotDuplicate')),
    ).toBe(false);
  });
});

describe('assertChallengeWindow', () => {
  it('accepts exactly thirty minutes and rejects less', () => {
    expect(() =>
      assertChallengeWindow(10_000, 1_810_000),
    ).not.toThrow();
    expect(() =>
      assertChallengeWindow(10_000, 1_809_999),
    ).toThrow('thirty minutes');
  });
});
