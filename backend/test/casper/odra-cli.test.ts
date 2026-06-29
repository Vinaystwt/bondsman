import { describe, expect, it } from 'vitest';
import {
  bytesArgument,
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
