import { describe, expect, it } from 'vitest';
import { deploymentSchema } from '../../src/shared/deployment.js';

describe('deploymentSchema', () => {
  it('accepts the stable frontend deployment shape', () => {
    const contract = {
      packageHash: `hash-${'1'.repeat(64)}`,
      contractHash: `hash-${'2'.repeat(64)}`,
    };
    const account = {
      publicKey: `01${'3'.repeat(64)}`,
      accountHash: '4'.repeat(64),
    };
    const deployment = deploymentSchema.parse({
      network: 'casper-test',
      chainName: 'casper-test',
      nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
      contracts: {
        mockCsprUsd: contract,
        bondVault: contract,
        controller: contract,
        invoicePool: contract,
      },
      accounts: {
        deployer: account,
        agent: account,
        challenger: account,
      },
    });

    expect(deployment.chainName).toBe('casper-test');
  });

  it('rejects another network', () => {
    expect(() =>
      deploymentSchema.parse({
        network: 'casper',
        chainName: 'casper',
      }),
    ).toThrow();
  });
});
