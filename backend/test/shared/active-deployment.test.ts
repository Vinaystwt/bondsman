import { describe, expect, it } from 'vitest';
import {
  activeControllerVersion,
  applyActiveControllerVersion,
} from '../../src/shared/active-deployment.js';
import type { Deployment } from '../../src/shared/deployment.js';

const account = {
  publicKey: `01${'1'.repeat(64)}`,
  accountHash: '2'.repeat(64),
};

function contract(seed: string) {
  return {
    packageHash: `hash-${seed.repeat(64)}`,
    contractHash: `hash-${seed.repeat(64)}`,
  };
}

const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  current: 'v2',
  contracts: {
    mockCsprUsd: contract('1'),
    bondVault: contract('2'),
    controller: contract('3'),
    invoicePool: contract('4'),
  },
  versions: {
    v1: {
      mockCsprUsd: contract('1'),
      bondVault: contract('5'),
      controller: contract('6'),
      invoicePool: contract('7'),
    },
    v2: {
      mockCsprUsd: contract('1'),
      bondVault: contract('8'),
      controller: contract('9'),
      invoicePool: contract('a'),
      verifiers: {
        duplicateClaim: contract('b'),
        deliveryContradiction: contract('c'),
      },
    },
  },
  accounts: {
    deployer: account,
    agent: account,
    challenger: account,
    watchdog: account,
  },
} as Deployment;

describe('active controller deployment override', () => {
  it('uses the deployment current suite when no override is present', () => {
    expect(activeControllerVersion(deployment, {} as NodeJS.ProcessEnv)).toBe('v2');
    expect(
      applyActiveControllerVersion(deployment, {} as NodeJS.ProcessEnv).contracts.controller,
    ).toEqual(deployment.versions?.v2?.controller);
  });

  it('flips to V1 then back to V2 without editing deployments/testnet.json', () => {
    const v1 = applyActiveControllerVersion(deployment, {
      ACTIVE_CONTROLLER_VERSION: 'v1',
    } as NodeJS.ProcessEnv);
    const v2 = applyActiveControllerVersion(deployment, {
      ACTIVE_CONTROLLER_VERSION: 'v2',
    } as NodeJS.ProcessEnv);

    expect(v1.current).toBe('v1');
    expect(v1.contracts.controller).toEqual(deployment.versions?.v1?.controller);
    expect(v2.current).toBe('v2');
    expect(v2.contracts.controller).toEqual(deployment.versions?.v2?.controller);
  });

  it('rejects unsupported override values', () => {
    expect(() =>
      applyActiveControllerVersion(deployment, {
        ACTIVE_CONTROLLER_VERSION: 'mainnet',
      } as NodeJS.ProcessEnv),
    ).toThrow('ACTIVE_CONTROLLER_VERSION must be v1 or v2');
  });
});

