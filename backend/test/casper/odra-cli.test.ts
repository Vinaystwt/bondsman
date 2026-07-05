import { describe, expect, it } from 'vitest';
import {
  bytesArgument,
  canFallbackTransaction,
  transactionHash,
} from '../../src/casper/odra-cli.js';

describe('bytesArgument', () => {
  it('formats bytes for generated Odra commands', () => {
    expect(bytesArgument(Buffer.from([0, 127, 255]))).toBe('0,127,255');
  });
});

describe('transactionHash', () => {
  it('extracts a confirmed transaction hash', () => {
    const hash = 'a'.repeat(64);
    expect(
      transactionHash(
        `Transaction "${hash}" successfully executed.`,
      ),
    ).toBe(hash);
  });
});

describe('canFallbackTransaction', () => {
  const cloudConfig = {
    cloudApiKey: 'token',
  } as Parameters<typeof canFallbackTransaction>[1];

  it('allows public retry only when cloud rejects before submission', () => {
    expect(
      canFallbackTransaction(
        new Error('HTTP status client error (401 Unauthorized)'),
        cloudConfig,
      ),
    ).toBe(true);
    expect(
      canFallbackTransaction(
        new Error('HTTP status client error (403 Forbidden)'),
        cloudConfig,
      ),
    ).toBe(true);
  });

  it('does not retry ambiguous submission failures', () => {
    expect(
      canFallbackTransaction(
        new Error('Timeout waiting for transaction'),
        cloudConfig,
      ),
    ).toBe(false);
    expect(
      canFallbackTransaction(
        new Error('401 Unauthorized'),
        {} as Parameters<typeof canFallbackTransaction>[1],
      ),
    ).toBe(false);
  });
});
