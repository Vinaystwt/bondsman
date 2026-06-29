import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/env.js';

describe('loadConfig', () => {
  it('rejects every chain except Casper testnet', () => {
    expect(() =>
      loadConfig({
        CHAIN_NAME: 'casper',
        DEPLOYER_SECRET_KEY_PATH: '/tmp/deployer.pem',
      }),
    ).toThrow('CHAIN_NAME must be casper-test');
  });

  it('falls back to the public testnet RPC without a cloud key', () => {
    const config = loadConfig({
      CHAIN_NAME: 'casper-test',
      DEPLOYER_SECRET_KEY_PATH: '/tmp/deployer.pem',
      NODE_RPC_URL: 'https://node.testnet.cspr.cloud',
      EVENTS_URL: 'https://node.testnet.cspr.cloud/events',
      CSPR_CLOUD_API_KEY: '',
    });

    expect(config.nodeRpcUrl).toBe(
      'https://node.testnet.casper.network/rpc',
    );
    expect(config.eventsUrl).toBe(
      'https://node.testnet.casper.network/events',
    );
    expect(config.usingPublicRpc).toBe(true);
  });
});
