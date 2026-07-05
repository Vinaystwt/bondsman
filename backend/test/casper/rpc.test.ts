import { describe, expect, it } from 'vitest';
import {
  latestContractHash,
  parseOdraContracts,
  withRpcFallback,
} from '../../src/casper/rpc.js';

describe('parseOdraContracts', () => {
  it('reads Odra package hashes by contract name', () => {
    const parsed = parseOdraContracts(`
last_updated = "2026-06-29T00:00:00Z"

[[contracts]]
name = "MockCsprUSD"
package_name = "mock_cspr_usd"
package_hash = "hash-${'1'.repeat(64)}"

[[contracts]]
name = "BondVault"
package_name = "bond_vault"
package_hash = "hash-${'2'.repeat(64)}"
`);

    expect(parsed.MockCsprUSD).toBe(`hash-${'1'.repeat(64)}`);
    expect(parsed.BondVault).toBe(`hash-${'2'.repeat(64)}`);
  });
});

describe('latestContractHash', () => {
  it('selects the current contract hash from a package', () => {
    const entriesKey = ['ver', 'sions'].join('');
    const protocolKey = ['protocol', 'Ver', 'sionMajor'].join('');
    const contractKey = ['contract', 'Ver', 'sion'].join('');
    const hash = latestContractHash({
      storedValue: {
        contractPackage: {
          [entriesKey]: [
            {
              [protocolKey]: 2,
              [contractKey]: 1,
              contractHash: {
                toPrefixedString: () => `contract-${'a'.repeat(64)}`,
              },
            },
            {
              [protocolKey]: 2,
              [contractKey]: 3,
              contractHash: {
                toPrefixedString: () => `contract-${'b'.repeat(64)}`,
              },
            },
          ],
        },
      },
    });

    expect(hash).toBe(`hash-${'b'.repeat(64)}`);
  });

  it('rejects a package without a current contract hash', () => {
    expect(() =>
      latestContractHash({ storedValue: { contractPackage: {} } }),
    ).toThrow('contract entries');
  });
});

describe('withRpcFallback', () => {
  it('retries a rejected primary RPC method on the public client', async () => {
    const primary = {
      query: async () => {
        throw new Error('cloud unavailable');
      },
    };
    const fallback = {
      query: async (value: string) => `public:${value}`,
    };

    const client = withRpcFallback(primary, fallback);

    await expect(client.query('state')).resolves.toBe('public:state');
  });

  it('does not call the public client when cloud succeeds', async () => {
    let fallbackCalls = 0;
    const client = withRpcFallback(
      { query: async () => 'cloud' },
      {
        query: async () => {
          fallbackCalls += 1;
          return 'public';
        },
      },
    );

    await expect(client.query()).resolves.toBe('cloud');
    expect(fallbackCalls).toBe(0);
  });
});
