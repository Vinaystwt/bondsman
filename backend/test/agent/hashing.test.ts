import { describe, expect, it } from 'vitest';
import {
  blake2b256,
  claimHash,
  claimInput,
} from '../../src/agent/hashing.js';

describe('blake2b256', () => {
  it('matches the published digest for abc', () => {
    expect(blake2b256('abc').toString('hex')).toBe(
      'bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319',
    );
  });
});

describe('claimHash', () => {
  it('hashes an unambiguous debtor and invoice-number input', () => {
    expect(claimInput('Acme GmbH', 'INV-1045')).toBe(
      '9:Acme GmbH|8:INV-1045',
    );
    expect(claimHash('Acme GmbH', 'INV-1045')).toHaveLength(32);
    expect(claimHash('Acme GmbH', 'INV-1045')).toEqual(
      claimHash('Acme GmbH', 'INV-1045'),
    );
    expect(claimHash('Acme GmbH', 'INV-1045')).not.toEqual(
      claimHash('Acme GmbH', 'INV-1046'),
    );
  });
});
