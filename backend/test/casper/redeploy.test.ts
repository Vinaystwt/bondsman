import { describe, expect, it } from 'vitest';
import { retainTokenContract } from '../../../scripts/redeploy.js';

describe('retainTokenContract', () => {
  it('keeps only MockCsprUSD and preserves its package hash', () => {
    const tokenHash = `hash-${'1'.repeat(64)}`;
    const source = `
last_updated = "2026-06-30T00:00:00Z"

[[contracts]]
name = "MockCsprUSD"
package_name = "MockCsprUSD"
package_hash = "${tokenHash}"

[[contracts]]
name = "BondVault"
package_name = "BondVault"
package_hash = "hash-${'2'.repeat(64)}"
`;

    const result = retainTokenContract(source, tokenHash);

    expect(result).toContain('name = "MockCsprUSD"');
    expect(result).toContain(`package_hash = "${tokenHash}"`);
    expect(result).not.toContain('BondVault');
  });

  it('rejects a token package mismatch', () => {
    expect(() =>
      retainTokenContract(
        `[[contracts]]
name = "MockCsprUSD"
package_hash = "hash-${'1'.repeat(64)}"`,
        `hash-${'2'.repeat(64)}`,
      ),
    ).toThrow('token package hash');
  });
});
